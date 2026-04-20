import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`DAYFLOW backend listening on port ${env.port}`);
});
