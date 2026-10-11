vim9script
import autoload '../autoload/hellshake_yano/native/dictionary.vim' as Dictionary
var dir = tempname()
mkdir(dir, 'p')
try
  var path = dir .. '/dictionary % # | safe.json'
  writefile(['{"customWords":["old"],"preserveWords":["keep"],"metadata":{"mine":true},"unrelated":[1,2]}'], path)
  setfperm(path, 'rw-------')
  Dictionary.Add(path, ' newword ', 'meaning', 'noun')
  var data = json_decode(join(readfile(path), "\n"))
  assert_equal(['old', 'newword'], data.customWords)
  assert_equal([1, 2], data.unrelated)
  assert_true(data.metadata.mine)
  assert_equal('meaning', data.words[0].meaning)
  assert_equal('rw-------', getfperm(path))
  Dictionary.Add(path, 'newword', 'changed')
  data = json_decode(join(readfile(path), "\n"))
  assert_equal(2, len(data.customWords))
  assert_equal(1, len(data.words))
  assert_equal('changed', data.words[0].meaning)
  var before = readfile(path, 'b')
  writefile(['{"customWords":["concurrent"]}'], path)
  var rejected = false
  try
    Dictionary.WriteChecked(path, before, '{"customWords":["overwrite"]}', 'rw-------')
  catch /^hellshake-yano:/
    rejected = true
  endtry
  assert_true(rejected)
  assert_equal(['concurrent'], Dictionary.Load(path).customWords)
  assert_equal([], glob(dir .. '/.hellshake-yano-*', false, true))
  for item in [{name: 'dict.yaml', content: 'customWords: [old]'}, {name: 'bad.json', content: '{broken'}]
    var target = dir .. '/' .. item.name
    writefile([item.content], target)
    rejected = false
    try
      Dictionary.Add(target, 'newword')
    catch
      rejected = true
    endtry
    assert_true(rejected)
    assert_equal([item.content], readfile(target))
  endfor
  var link = dir .. '/link.json'
  system('ln -s ' .. shellescape(path) .. ' ' .. shellescape(link))
  assert_equal('link', getftype(link))
  rejected = false
  try
    Dictionary.Add(link, 'unsafe')
  catch /^hellshake-yano:/
    rejected = true
  endtry
  assert_true(rejected)
  assert_equal(['concurrent'], Dictionary.Load(path).customWords)
  var created = dir .. '/nested/new.json'
  assert_equal(['created'], Dictionary.Add(created, 'created').customWords)
finally
  delete(dir, 'rf')
endtry
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
