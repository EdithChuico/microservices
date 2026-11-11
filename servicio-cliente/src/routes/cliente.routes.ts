import type { FastifyInstance } from 'fastify';
import {
    obtenerClienteId,
    obtenerClientes,
    actualizarCliente,
    eliminarCliente,
    crearCliente
} from "../controllers/cliente.controler";

const clienteBodySchema = {
    type: 'object',
    required: ['nombre', 'direccion', 'telefono'],
    properties: {
        nombre: {
            type: 'string',
            minLength: 2,
            maxLength: 100
        },
        direccion: {
            type: 'string',
            minLength: 3
        },
        telefono: {
            type: 'string',
            minLength: 7,
            maxLength: 15,
            pattern: '^[0-9+\\s-]+$'
        }
    }
};
const clienteParamSchema = {
    type: 'object',
    required: ['id'],
    properties: {
        id: {
            type: 'integer',
            minimum: 1
        }
    }
};

export const clienteRouter = async (app: FastifyInstance) => {

    app.get("/clientes", async (req, res) => {
        try {
            return await obtenerClientes();
        } catch (error) {
            res.code(500).send({ mensaje: "Error al obtener clientes" });
        }
    });

    app.get<{ Params: { id: number } }>("/clientes/:id", {
        schema: {
            params: clienteParamSchema
        }
    }, async (req, res) => {
        try {
            const { id } = req.params;
            return await obtenerClienteId(id);
        } catch (error: any) {
            res.code(404).send({ mensaje: error.message || "Cliente no encontrado" });
        }
    });

    app.post("/clientes", {
        schema: {
            body: clienteBodySchema
        }
    }, async (req, res) => {
        try {
            const cliente = req.body;
            const nuevoCliente = await crearCliente(cliente);
            return res.code(201).send(nuevoCliente);
        } catch (error) {
            res.code(500).send({ mensaje: "Error al crear el cliente" });
        }
    });

    app.put<{ Params: { id: number } }>("/clientes/:id", {
        schema: {
            params: clienteParamSchema,
            body: clienteBodySchema
        }
    }, async (req, res) => {
        try {
            const { id } = req.params;
            const datosCliente = req.body;
            return await actualizarCliente(id, datosCliente);
        } catch (error: any) {
            res.code(400).send({ mensaje: error.message || "Error al actualizar el cliente" });
        }
    });

    app.delete<{ Params: { id: number } }>("/clientes/:id", {
        schema: {
            params: clienteParamSchema
        }
    }, async (req, res) => {
        try {
            const { id } = req.params;
            return await eliminarCliente(id);
        } catch (error: any) {
            res.code(400).send({ mensaje: error.message || "Error al eliminar el cliente" });
        }
    });
};