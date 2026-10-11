vim9script
import autoload '../autoload/hellshake_yano/native/dictionary.vim' as Dictionary
var data = Dictionary.Parse('{"customWords":["非同期処理"],"preserveWords":["に"],"hintPatterns":[{"pattern":"function\\s+(\\w+)","captureGroup":1,"priority":20}]}', 'json')
assert_equal('capture:1', data.hintPatterns[0].hintPosition)
var words = [{text: 'function', line: 1, col: 1}, {text: 'hello', line: 1, col: 10}]
var found = Dictionary.Apply(words, ['function hello'], 1, data)
assert_equal(20, found[1].hintPriority)
assert_false(has_key(words[1], 'hintPriority'))
assert_equal([{text: '非同期処理', line: 1, col: 3}], Dictionary.Apply([], ['x 非同期処理'], 1, data))
assert_equal(['short', '日本語'], Dictionary.Parse("short\n# comment\n日本語", 'txt').customWords)
assert_equal('capture:1', Dictionary.Parse('@10:function (word):capture:1', 'txt').hintPatterns[0].hintPosition)
for bad in ['{"customWords":[123]}', '{"hintPatterns":[{"pattern":"(?<=prefix)word"}]}',
    '{"hintPatterns":[{"pattern":"[\\D]"}]}', '[]']
  var rejected = false
  try
    Dictionary.Parse(bad, 'json')
  catch
    rejected = true
  endtry
  assert_true(rejected, bad)
endfor
var tmp = tempname() .. '.json'
writefile(['{"customWords":["beta"]}'], tmp)
assert_equal(['beta'], Dictionary.Load(tmp).customWords)
delete(tmp)
for f in json_decode(join(readfile('tests-vim9/fixtures/regex.json'), "\n"))
  var matched = matchstrpos(f.line, Dictionary.Regex(f.pattern))
  assert_equal(f.expected, matched[1] < 0 ? v:null : matched[0 : 1], f.pattern .. ' : ' .. f.line)
endfor
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr')
  cquit
endif
writefile(['PASS Vim9 dictionary: JSON/text schema, literals, capture metadata and explicit regex limits'], '/dev/stdout')
qa!
