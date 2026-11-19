import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import { FacturaService } from './factura.service.js';
import type { Factura } from '../../models/factura.model.js';
import type { DetalleFactura } from '../../models/detalle-factura-model.js';

@Controller('factura')
export class FacturaController {
    constructor(private readonly facturaService: FacturaService) { }

    @Post()
    crear(@Body() data: Factura) {
        return this.facturaService.crear(data);
    }

    @Get()
    listar() {
        return this.facturaService.listar();
    }

    @Get(':codigo')
    consultar(@Param('codigo') codigo: string) {
        return this.facturaService.consultar(codigo);
    }

    @Put(':codigo')
    actualizar(@Param('codigo') codigo: string, @Body() data: Partial<Factura>) {
        return this.facturaService.actualizar(codigo, data);
    }

    @Delete(':codigo')
    eliminar(@Param('codigo') codigo: string) {
        return this.facturaService.eliminar(codigo);
    }

    @Post(':codigo/detalles')
    agregarDetalle(
        @Param('codigo') codigo: string,
        @Body() data: DetalleFactura,
    ) {
        return this.facturaService.agregarDetalle(codigo, data);
    }

    @Patch(':codigo/detalles/:codDetalle')
    actualizarDetalle(
        @Param('codigo') codigo: string,
        @Param('codDetalle', ParseIntPipe) codDetalle: number,
        @Body() data: Partial<DetalleFactura>,
    ) {
        return this.facturaService.actualizarDetalle(codigo, codDetalle, data);
    }

    @Delete(':codigo/detalles/:codDetalle')
    eliminarDetalle(
        @Param('codigo') codigo: string,
        @Param('codDetalle', ParseIntPipe) codDetalle: number,
    ) {
        return this.facturaService.eliminarDetalle(codigo, codDetalle);
    }

    @Post(':codigo/calcular-total')
    calcularTotal(@Param('codigo') codigo: string) {
        return this.facturaService.calcularTotal(codigo);
    }
}