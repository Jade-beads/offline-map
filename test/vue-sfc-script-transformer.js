const babelJest = require('babel-jest')

const scriptTransformer = babelJest.createTransformer()

function getScriptContent(source) {
  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  return scriptMatch ? scriptMatch[1] : 'export default {}'
}

module.exports = {
  process(source, filename, config, options) {
    return scriptTransformer.process(getScriptContent(source), filename, config, options)
  }
}
