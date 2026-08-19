import { app } from "@/server/app";

const worker = {
  fetch: app.fetch,
};

export default worker;
