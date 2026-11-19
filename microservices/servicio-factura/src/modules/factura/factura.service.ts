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
    //agregarDetalle

    //Actualizar detalle con PATH

    //eliminarDetalle

    //calcularTotal  (con consulta al microservicio Productos)

}
