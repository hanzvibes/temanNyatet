import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());

// The Mayar webhook route must receive the raw body so we can verify the
// HMAC-SHA256 signature against exact bytes. Mount express.raw() for that
// specific path BEFORE the global express.json() parser consumes the body.
app.use("/api/mayar-webhook", express.raw({ type: "application/json", limit: "1mb" }));

// All other routes get JSON-parsed bodies.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
