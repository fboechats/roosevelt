/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const fs = require('fs')
const path = require('path')
const proxyquire = require('proxyquire')
const sinon = require('sinon')

describe('HTTPS server options', function () {
  const appDir = path.join(__dirname, '../app/constructorParams')
  const config = require('../util/testHttpsConfig.json')

  const stubHttpsListen = sinon.stub()
  const stubHttpsOn = sinon.stub()
  const stubHttpsServer = sinon.stub().returns({
    listen: stubHttpsListen,
    on: stubHttpsOn
  })
  const stubHttps = {
    Server: stubHttpsServer
  }

  const stubHttpServer = sinon.stub().returns({
    listen: sinon.stub(),
    on: sinon.stub()
  })
  const stubHttp = {
    Server: stubHttpServer
  }

  let app

  before(function () {
    app = proxyquire('../../roosevelt', {'https': stubHttps, 'http': stubHttp})
  })

  afterEach(function () {
    stubHttpsListen.resetHistory()
    stubHttpsOn.resetHistory()
    stubHttpsServer.resetHistory()

    stubHttpServer.resetHistory()
  })

  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should create https.Server when enabled', function () {
    app({appDir: appDir, ...config})
    assert(stubHttpsServer.called, 'https.Server was not called')
  })

  it('should create http.Server when httpsOnly is false', function () {
    config.https.httpsOnly = false

    app({appDir: appDir, ...config})
    assert(stubHttpServer.called, 'http.Server was not called')

    config.https.httpsOnly = true
  })

  it('should not create http.Server when httpsOnly is true', function () {
    app({appDir: appDir, ...config})
    assert(stubHttpServer.notCalled, 'http.Server called despite httpsOnly flag')
  })

  it('should use given pfx file if pfx option is true', function () {
    let keytext = fs.readFileSync(path.join(__dirname, '../util/test.p12'))

    config.https.pfx = true

    app({appDir: appDir, ...config})
    assert(typeof stubHttpsServer.args[0][0].key === 'undefined', 'https.Server had key when using pft')
    assert(typeof stubHttpsServer.args[0][0].cert === 'undefined', 'https.Server had cert when using pfx')
    assert(stubHttpsServer.args[0][0].pfx.equals(keytext), 'https.Server pfx file did not match supplied')

    config.https.pfx = false
  })

  it('should use key/cert if pfx option is false', function () {
    let keytext = fs.readFileSync(path.join(__dirname, '../util/test.req.key'))
    let certext = fs.readFileSync(path.join(__dirname, '../util/test.req.crt'))

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].key.equals(keytext), 'https.Server key file did not match supplied')
    assert(stubHttpsServer.args[0][0].cert.equals(certext), 'https.Server cert file did not match supplied')
    assert(typeof stubHttpsServer.args[0][0].pfx === 'undefined', 'https.Server had pfx when using key/cert')
  })

  it('should read certificate authority from file if cafile is true', function () {
    let catext = fs.readFileSync(path.join(__dirname, '../util/ca.crt'))

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].ca.equals(catext), 'https.Server CA did not match supplied CA')
  })

  it('should be able to read array of certificates', function () {
    let ca1 = fs.readFileSync(path.join(__dirname, '../util/ca.crt'))
    let ca2 = fs.readFileSync(path.join(__dirname, '../util/ca-2.crt'))

    config.https.ca = ['test/util/ca.crt', 'test/util/ca-2.crt']

    app({appDir: appDir, ...config})
    assert(stubHttpsServer.args[0][0].ca[0].equals(ca1), 'https.Server CA (1) did not match supplied CA')
    assert(stubHttpsServer.args[0][0].ca[1].equals(ca2), 'https.Server CA (2) did not match supplied CA')

    config.https.ca = 'test/util/ca.crt'
  })

  it('should pass certificate authority directly to httpsServer if cafile is false', function () {
    config.https.cafile = false
    config.https.ca = '-----BEGIN CERTIFICATE-----\n' + // I don't think template strings work here
    'MIIDQzCCAiugAwIBAgIQF8srJKSW5mmwV866G/hT5TANBgkqhkiG9w0BAQsFADAW\n' +
    'MRQwEgYDVQQDEwtFYXN5LVJTQSBDQTAeFw0xODAyMTIxNzAwMDZaFw0yODAyMTAx\n' +
    'NzAwMDZaMBYxFDASBgNVBAMTC0Vhc3ktUlNBIENBMIIBIjANBgkqhkiG9w0BAQEF\n' +
    'AAOCAQ8AMIIBCgKCAQEAhM0ODGErReN9K2R8YWykJYz9epwBNXGt9+APgyebvCq4\n' +
    'ObvA+oD4UYW/XpXOm9zjqiLWXU6CHHxjEMfla1JJmpMSNH0/5PSc4d9k9rXuL6gp\n' +
    'J7wBchMLTi05NB82nm8URyflhmQ2T+zbK80v/S3tZiPlT02ZC7OPP5d0zBw5jYvy\n' +
    'uxrp9/A5HYuxUPbJ8SgNJLPH63TguBV2OlpObH08+6kcY9DCYIgEVvwMmMN1YBL8\n' +
    'ofdnnfk8VbDz7RJVrafgW0mwgArRn9dLC7cm96CypXUFPJU46bZhuTKoxWHxIqkt\n' +
    'ro8UEaDLF66NY6hca5p7nrMIl1vrY04jO723YuSsQQIDAQABo4GMMIGJMB0GA1Ud\n' +
    'DgQWBBS5433NSfKiVlgW7wFp+e6+sYDXszBNBgNVHSMERjBEgBS5433NSfKiVlgW\n' +
    '7wFp+e6+sYDXs6EapBgwFjEUMBIGA1UEAxMLRWFzeS1SU0EgQ0GCEBfLKySkluZp\n' +
    'sFfOuhv4U+UwDAYDVR0TBAUwAwEB/zALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEL\n' +
    'BQADggEBAGXgFtDkA/S2D3BnEMZNvDcRaEczEfE8XT1hF2j4nhOEHojrDoazEtVe\n' +
    'SKqAaMynIs5OqoxWQv7z7trRnQ73yEv1Vxi8lHVZoopuobrOFANGIjC73ceoMPRM\n' +
    'IK9XVUF9lm3HzIRDviixPA01E+xW+g1PPBhz8vwKYBS/Nb8N/qoQqTYDBxsDLAJV\n' +
    'NDTIbDFOADN0VtuAl9NDPMlgie1OUzxz3P44RANN5XdCg+zmuCMyu1KH6AzMtg4/\n' +
    'lPEuFed++GKPVVLnWr2JMMUjkAuaaznPKa7/8EOaTsHMSZn112FWefx42EVilCwt\n' +
    'XCZitgHzPt438kahlyyc+gOqBrrc+vk=' +
    '-----END CERTIFICATE-----'

    app({appDir: appDir, ...config})
    assert.equal(stubHttpsServer.args[0][0].ca, config.https.ca, 'https.Server CA did not match supplied CA')

    config.https.ca = 'test/util/ca.crt'
    config.https.cafile = true
  })

  // the following test requires starting the https server
  //   it('should start the https server with the correct options', function () {
  //     app({appDir: appDir, ...config})
  //     assert.equal(stubHttpsListen.args[0][0], config.https.httpsPort, 'httpsServer.listen port did not match supplied port')
  //     assert.equal(stubHttpsListen.args[0][1], 'localhost', 'httpsServer.listen domain did not match localhost')
  //   })
})
