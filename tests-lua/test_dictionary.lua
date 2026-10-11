vim.opt.runtimepath:prepend(vim.fn.getcwd())
local dictionary = require('hellshake_yano.dictionary')
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
local yaml = [[
# dictionary without external YAML or JS runtimes
customWords:
  - 非同期処理
  - 'it''s safe'
preserveWords: [に, 'は']
mergeRules:
  test: always
hintPatterns:
  - pattern: 'function\s+(\w+)'
    captureGroup: 1
    priority: 20
  - pattern: '^class (\w+)'
    hintPosition: 'capture:1'
    priority: 10
metadata:
  description: "quoted # value"
]]
local parsed = dictionary.parse(yaml,'yaml')
eq({'非同期処理', "it's safe"},parsed.customWords)
eq({'に','は'},parsed.preserveWords)
eq({"don't"},dictionary.parse("customWords: [don't] # comment",'yaml').customWords)
eq('capture:1',parsed.hintPatterns[1].hintPosition)
eq('quoted # value',parsed.metadata.description)
eq({"it's # safe"},dictionary.parse("customWords: ['it''s # safe'] # outside",'yaml').customWords)
eq("it's: safe, too",require('hellshake_yano.yaml').decode("data: {text: 'it''s: safe, too'}").data.text)
local words={{text='function',line=1,col=1},{text='hello',line=1,col=10},{text='world',line=1,col=16}}
local result=dictionary.apply(words,{'function hello world'},1,parsed)
eq(20,result[2].hintPriority)
eq(nil,words[2].hintPriority)
local extracted=dictionary.apply({}, {'x 非同期処理'}, 1, parsed)
assert(#extracted==1 and extracted[1].text=='非同期処理' and extracted[1].col==3)
local hints=require('hellshake_yano.hints')
local assigned=hints.assign({{line=1,col=8,text='near'},{line=3,col=1,text='important',hintPriority=20}},
  {'A','BB'},{line=1,col=1,winid=1},{})
eq('near',assigned[1].text) -- Legacy assignment remains distance-first.
local tmp=vim.fn.tempname()..'.yaml'
vim.fn.writefile(vim.split(yaml,'\n'),tmp)
eq(parsed,dictionary.load(tmp))
local runtime=require('hellshake_yano')
vim.fn.writefile({'customWords: [beta]'},tmp)
runtime.setup({dictionaryPath=tmp,defaultMinWordLength=8,singleCharKeys='A',motionTimeout=100})
vim.api.nvim_buf_set_lines(0,0,-1,false,{'alpha beta'})
vim.api.nvim_win_set_cursor(0,{1,0})
vim.api.nvim_feedkeys('A','t',false)
eq('jumped',runtime.show())
eq({1,6},vim.api.nvim_win_get_cursor(0))
vim.fn.writefile({'customWords: &bad []'},tmp)
assert(not pcall(runtime.reload_dictionary))
eq({'beta'},runtime.get_dictionary().customWords)
vim.fn.delete(tmp)
assert(not pcall(dictionary.load,tmp),'missing file must be reported')
assert(not pcall(dictionary.parse,'customWords: &anchor [foo]\npreserveWords: *anchor','yaml'),'unsupported aliases must not be silently ignored')
assert(not pcall(dictionary.parse,'customWords: []\ncustomWords: []','yaml'),'duplicate keys must be rejected')
assert(not pcall(dictionary.parse,'{"customWords": [123]}','json'),'invalid types must be rejected')
assert(not pcall(dictionary.parse,'hintPatterns:\n  - pattern: "(?<=prefix)word"\n    hintPosition: start','yaml'),'unsupported JS regex must be explicit')
eq({'short','日本語'},dictionary.parse('short\n# comment\n日本語','txt').customWords)
eq('capture:1',dictionary.parse('@10:function (word):capture:1','txt').hintPatterns[1].hintPosition)
local sample=dictionary.parse(table.concat(vim.fn.readfile('samples/dictionaries/dictionary.yaml'),'\n'),'yaml')
assert(#sample.customWords>10)
assert(#sample.hintPatterns>0)
local function pattern_priority(pattern, line, col, text, capture)
  local d=dictionary.parse(vim.json.encode({hintPatterns={{pattern=pattern,captureGroup=capture or 1,priority=9}}}),'json')
  local got=dictionary.apply({{line=1,col=col,text=text}},{line},1,d)
  eq(9,got[1].hintPriority)
end
pattern_priority('^\\s*-\\s*\\[\\s\\]\\s+(.)','- [ ] task',7,'task')
pattern_priority('\\bfunction\\s+(\\w+)','function hello',10,'hello')
pattern_priority('x=(\\w+)','x=hello',3,'hello')
pattern_priority('^>\\s*(.)','> quote',3,'quote')
pattern_priority('\\b(word)\\b','éwordé',3,'word')
pattern_priority('([\\d]+)','123',1,'123')
pattern_priority('([\\w]+)','hello',1,'hello')
pattern_priority('[\\s]+(hello)',' '..'hello',2,'hello')
pattern_priority('\\s+(hello)',' hello',3,'hello')
pattern_priority('\\_s(hello)','_shello',3,'hello')
vim.o.ignorecase=true
local case_dictionary=dictionary.parse('{"hintPatterns":[{"pattern":"hello","priority":9}]}','json')
eq(nil,dictionary.apply({{line=1,col=1,text='HELLO'}},{'HELLO'},1,case_dictionary)[1].hintPriority)
vim.o.ignorecase=false
assert(not pcall(dictionary.parse,'{"hintPatterns":[{"pattern":"[\\\\D]"}]}','json'),
  'unsupported complement in a class must be explicit')
print('PASS: native YAML/JSON/text dictionaries, capture targets, schema errors, explicit unsupported syntax')
assert(vim.v.errmsg=='',vim.v.errmsg)
vim.cmd('qa!')
