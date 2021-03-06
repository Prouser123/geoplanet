// 'geoplanet' postinstall script

const Listr = require("listr");
const Axios = require("axios").default;
const { Observable } = require("rxjs");
const bytes = require("pretty-bytes");
const Anzip = require("anzip");

const fs = require("fs-extra");

const opts = require("./package.json").dist;

const tasks = new Listr([
  {
    title: "Preparations",
    task: async () => await fs.emptyDir("data")
  },
  {
    title: "Download geoplanet data",
    task: () => {
      return new Observable(async observer => {
        observer.next("Starting download...");

        const { data, headers } = await Axios({
          url: opts.url,
          method: "get",
          responseType: "stream"
        });

        const contentLength = headers["content-length"];
        console.log(contentLength);

        observer.next("Downloading...");

        // Variables for download progress
        let done = 0;
        let start = new Date();

        // Pipe the download to a temp file
        const writer = fs.createWriteStream(opts.tmpName);

        // Run on every chunk recieved
        data.on("data", chunk => {
          done += chunk.length;

          // Fancy shmancy information while downloading
          // Shows percentage, size downloaded, download speed
          observer.next(
            `Downloading... (${(done / contentLength).toLocaleString("en", {
              style: "percent"
            })} - ${bytes(done)} / ${bytes(parseInt(contentLength))} @ ${bytes(
              done / ((new Date() - start) / 1000)
            )}/s)`
          );
        });
        data.pipe(writer);

        // Complete the observer when the download finishes
        data.on("end", () => observer.complete());
      });
    }
  },
  {
    title: "Unzip data",
    task: async () => await Anzip(opts.tmpName, { outputPath: "./data" })
  },
  {
    title: "Cleanup",
    task: async () => await fs.unlink(opts.tmpName)
  }
]);

tasks.run();
