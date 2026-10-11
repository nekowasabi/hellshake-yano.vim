vim9script
import autoload '../autoload/hellshake_yano/native/yaml.vim' as Yaml
import autoload '../autoload/hellshake_yano/native/dictionary.vim' as Dictionary
var source = [
  '# dictionary',
  'customWords:',
  '  - 非同期処理',
  "  - 'it''s safe'",
  "preserveWords: [に, 'は']",
  'mergeRules:',
  '  test: always',
  'hintPatterns:',
  "  - pattern: 'function\\s+(\\w+)'",
  '    captureGroup: 1',
  '    priority: 20',
  'metadata:',
  '  description: "quoted # value"',
]
var data = Dictionary.Parse(join(source, "\n"), 'yaml')
assert_equal(['非同期処理', "it's safe"], data.customWords)
assert_equal(['に', 'は'], data.preserveWords)
assert_equal('capture:1', data.hintPatterns[0].hintPosition)
assert_equal('quoted # value', data.metadata.description)
assert_equal(["don't"], Yaml.Decode("customWords: [don't] # comment").customWords)
assert_equal({a: {b: [1, 2, true]}, c: v:null}, Yaml.Decode('a: {b: [1, 2, true]}' .. "\nc: null"))
assert_equal({text: "it's # safe"}, Yaml.Decode("text: 'it''s # safe' # outside"))
assert_equal({data: {text: "it's: safe, too"}}, Yaml.Decode("data: {text: 'it''s: safe, too'}"))
var sample = Dictionary.Load('samples/dictionaries/dictionary.yaml')
assert_true(len(sample.customWords) > 10)
assert_true(len(sample.hintPatterns) > 0)
for bad in ['customWords: &anchor [foo]', "customWords: []\ncustomWords: []",
    "a: 1\n---\nb: 2", "a:\n\tb: 1", "a:\n  b: 1\n c: 2", "a: |\n  block"]
  var rejected = false
  try
    Yaml.Decode(bad)
  catch /^hellshake-yano:/
    rejected = true
  endtry
  assert_true(rejected, bad)
endfor
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
writefile(['PASS Vim9 YAML: data-only subset, sample dictionary and explicit unsupported syntax'], '/dev/stdout', 'a')
qa!
