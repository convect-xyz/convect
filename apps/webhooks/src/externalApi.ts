import "dotenv/config";
import ngrok from "ngrok";

(async function () {
  const url = await ngrok.connect({
    addr: 3000,
    hostname: "relieved-allegedly-turkey.ngrok-free.app",
  });
  console.log(url);
})();
