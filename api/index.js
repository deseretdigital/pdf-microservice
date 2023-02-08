const express = require('express')
const RenderPDF = require('chrome-headless-render-pdf')
const tracer = require('./tracer')
const formats = require('dd-trace/ext/formats');
const app = express()
const port = 3000

function ddtrace(...args) {
  if(tracer) {
    const span = tracer.scope().active();
    const time = new Date().toISOString();
    const record = { time, message: args };
    if(span) {
      tracer.inject(span.context(), formats.LOG, record);
    }
  }
}

app.get('/', (req, res) => {
  console.log(req.query)
  ddtrace('PDF MICROSERVICE - New Request', req.query)
  // return res.send(req.query)
  RenderPDF.generatePdfBuffer(req.query.url, {chromeOptions: ['--ignore-certificate-errors', '-no-sandbox']})
    .then((pdfBuffer) => {
      console.log('sending back data')
      ddtrace('PDF MICROSERVICE - Sending PDF')
      // res.set('Content-Type', 'application/pdf');
      res.send(pdfBuffer)
    }).catch((err) => {
      console.error(err)
      ddtrace('PDF MICROSERVICE - Error', err)
      res.send(err)
    });
})

const server = app.listen(port, () => console.log(`PDF app listening on port ${port}!`))

async function closeGracefully(signal) {
  console.log(`*^!@4=> Received signal to terminate: ${signal}`)

  server.close(() => console.log('Server terminated'))
  // await other things we should cleanup nicely
  process.kill(process.pid, signal);
}
process.once('SIGINT', closeGracefully)
process.once('SIGTERM', closeGracefully)