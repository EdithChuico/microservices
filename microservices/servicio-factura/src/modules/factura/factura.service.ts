import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../../prisma/db.js';
import { Factura } from '../../models/factura.model.js';
import { DetalleFactura } from '../../models/detalle-factura-model.js';

@Injectable()
export class FacturaService {
    async crear(data: Factura) {
        const factura = await db.orm.Factura.where({ codigo: data.codigo }).first();
        if (factura) {
            throw new ConflictException("código ya existente");
        }
        return db.orm.Factura.create({ ...data, fecha: new Date(data.fecha) });
    }

    async listar() {
        return db.orm.Factura.all();
    }

    async consultar(codigo: string) {
        const factura = await db.orm.Factura.where({ codigo: codigo }).first();
        if (!factura) {
            throw new NotFoundException("Factura no encontrada");
        }
        return factura;
    }

    async actualizar(codigo: string, data: Partial<Factura>) {
        const cambios: Record<string, unknown> = { ...data }
        if (data.fecha) {
            cambios.fecha = new Date(data.fecha);
        }
        const factura = db.orm.Factura.where({ codigo: codigo }).update(cambios);

        if (!factura) {
            throw new NotFoundException("Factura no encontrada");
        };

        return this.consultar(codigo);
    }

    async eliminar(codigo: string) {
        await this.consultar(codigo);
        await db.orm.Factura.where({ codigo }).delete();
        return { 'mensaje': 'Factura eliminada correctamente' };
    }

    //Detalle de factura
    async agregarDetalle(codigo: string, data: DetalleFactura) {
        const factura = await this.consultar(codigo);

        const detallesActuales: DetalleFactura[] = (factura as any).detalles ?? [];
        const existe = detallesActuales.some((d) => d.codigo === data.codigo);
        if (existe) {
            throw new ConflictException("Código de detalle ya existente");
        }

        const nuevosDetalles = [...detallesActuales, data];

        const total = Number(factura.total) + Number(data.subtotal);
        const iva = Math.round(total * 0.15 * 100) / 100;
        const total_a_pagar = Math.round((total + iva - Number(factura.descuento)) * 100) / 100;

        await db.orm.Factura.where({ codigo }).update({
            detalles: nuevosDetalles,
            total,
            iva,
            total_a_pagar,
        } as any);

        return this.consultar(codigo);
    }

    private recalcularTotales(detalles: DetalleFactura[], descuentoActual: number) {
        const total = Math.round(
            detalles.reduce((acc, item) => acc + Number(item.subtotal), 0) * 100
        ) / 100;
        const iva = Math.round(total * 0.15 * 100) / 100;
        const descuento = Number(descuentoActual) || 0;
        const total_a_pagar = Math.round((total + iva - descuento) * 100) / 100;

        return { total, iva, total_a_pagar };
    }

    // Actualizar detalle con PATCH
    async actualizarDetalle(
        codigoFactura: string,
        codigoDetalle: number,
        data: Partial<DetalleFactura>,
    ) {
        const factura = await this.consultar(codigoFactura);
        const detallesActuales: DetalleFactura[] = (factura as any).detalles ?? [];
        const index = detallesActuales.findIndex((d) => d.codigo === Number(codigoDetalle));
        if (index === -1) {
            throw new NotFoundException(`Detalle con código ${codigoDetalle} no encontrado en la factura`);
        }

        const detalleActual = detallesActuales[index];
        const detalleActualizado: DetalleFactura = {
            ...detalleActual, ...data, codigo: detalleActual.codigo
        };

        if ((data.cantidad !== undefined || data.cod_producto !== undefined) && data.subtotal === undefined) {
            const precio = await this.obtenerPrecioProducto(detalleActualizado.cod_producto);
            detalleActualizado.subtotal = Math.round(precio * Number(detalleActualizado.cantidad) * 100) / 100;
        }

        const nuevosDetalles = [...detallesActuales];
        nuevosDetalles[index] = detalleActualizado;

        const { total, iva, total_a_pagar } = this.recalcularTotales(nuevosDetalles, factura.descuento);

        await db.orm.Factura.where({ codigo: codigoFactura }).update({
            detalles: nuevosDetalles, total, iva, total_a_pagar
        } as any);

        return this.consultar(codigoFactura);
    }

    // Eliminar detalle
    async eliminarDetalle(codigoFactura: string, codigoDetalle: number) {
        const factura = await this.consultar(codigoFactura);
        const detallesActuales: DetalleFactura[] = (factura as any).detalles ?? [];
        const existe = detallesActuales.some((d) => d.codigo === Number(codigoDetalle));
        if (!existe) {
            throw new NotFoundException(`Detalle con código ${codigoDetalle} no encontrado en la factura`);
        }
        const nuevosDetalles = detallesActuales.filter((d) => d.codigo !== Number(codigoDetalle));
        const { total, iva, total_a_pagar } = this.recalcularTotales(nuevosDetalles, factura.descuento);

        await db.orm.Factura.where({ codigo: codigoFactura }).update({
            detalles: nuevosDetalles, total, iva, total_a_pagar
        } as any);

        return this.consultar(codigoFactura);
    }

    //calcularTotal  (con consulta al microservicio Productos)
    async calcularTotal(codigoFactura: string) {
        const factura = await this.consultar(codigoFactura);
        const detallesActuales: DetalleFactura[] = (factura as any).detalles ?? [];

        if (detallesActuales.length === 0) {
            throw new BadRequestException('La factura no tiene detalles para calcular');
        }
        const detallesRecalculados: DetalleFactura[] = await Promise.all(
            detallesActuales.map(async (detalle) => {
                const precioUnitario = await this.obtenerPrecioProducto(detalle.cod_producto);
                const subtotal = Math.round(precioUnitario * Number(detalle.cantidad) * 100) / 100;

                return { ...detalle, subtotal };
            }),
        );

        const { total, iva, total_a_pagar } = this.recalcularTotales(detallesRecalculados, factura.descuento,);

        await db.orm.Factura.where({ codigo: codigoFactura }).update({
            detalles: detallesRecalculados, total, iva, total_a_pagar
        } as any);

        return this.consultar(codigoFactura);
    }

    // Método para comunicarse con servicio-producto
    private async obtenerPrecioProducto(codProducto: number): Promise<number> {
        const baseUrl = process.env.PRODUCTO_SERVICE_URL || 'http://localhost:8000';
        const url = `${baseUrl}/api/${codProducto}`;

        try {
            const response = await fetch(url);

            if (response.status === 404) {
                throw new NotFoundException(`Producto con código ${codProducto} no existe en servicio-producto`);
            }
            if (!response.ok) {
                throw new BadRequestException(`Error al consultar producto ${codProducto}: HTTP ${response.status}`);
            }

            const producto = await response.json();
            const precio = Number(producto.precio ?? producto.price ?? producto.valor_unitario);

            if (isNaN(precio)) {
                throw new BadRequestException(`El producto ${codProducto} no tiene un campo de precio válido`);
            }

            return precio;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                `No se pudo conectar con servicio-producto en ${url}. Verifica que esté levantado.`,
            );
        }
    }
}
