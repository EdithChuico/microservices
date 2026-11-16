import Fastify from "fastify";
import { clienteRouter } from "./src/routes/cliente.routes";
import { sequelize } from "./src/config/database";

const app = Fastify({ logger: true });

// Registrar rutas
app.register(clienteRouter);

const start = async () => {
  try {
    await sequelize.sync();
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log("Servidor corriendo en http://localhost:3000");
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

start();