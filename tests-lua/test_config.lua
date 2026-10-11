vim.opt.runtimepath:prepend(vim.fn.getcwd())
local config=require('hellshake_yano.config')
local runtime=require('hellshake_yano')
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
assert(config.validate({}).valid)
for _, invalid in ipairs({{enabled=1},{maxHints=0},{motionTimeout=20},{perKeyMinLength={w='3'}},
  {multiWindowMaxWindows=-1},{singleCharKeys='AA'},{singleCharKeys=' '},{multiCharKeys='B/'},
  {hintPosition='unknown'},{wordDetectionStrategy='unknown'},{highlightHintMarker='bad group'},
  {highlightHintMarker={fg='not-a-color'}},{highlightHintMarker={ctermfg='LightSalmon'}},{singleCharKeys=''},{markers={}}}) do
  assert(not config.validate(invalid).valid,vim.inspect(invalid))
  assert(not pcall(config.resolve,invalid))
end
local result=config.resolve({motion_count=2,motion_timeout=100,per_key_min_length={w=2},default_min_word_length=4})
eq(2,result.defaultMotionCount)
eq(100,result.motionTimeout)
eq(2,result.perKeyMinLength.w)
eq(4,result.defaultMinWordLength)
eq(false,config.resolve({directional_hint_filter=0}).directionalHintFilter)
eq(true,config.resolve({directional_hint_filter='true'}).directionalHintFilter)
eq(5,config.resolve({motionCount=5,motion_count=2}).motionCount)
runtime.setup({singleCharKeys='/',highlightHintMarker={bg='black',fg='#57FD14'}})
runtime.activate()
assert(not pcall(runtime.setup,{singleCharKeys='AA'}))
eq('/',runtime.get_config().singleCharKeys)
eq(2,vim.fn.exists(':HellshakeYanoToggle'))
runtime.deactivate()
print('PASS: config validation, aliases, colors and transactional failed setup')
assert(vim.v.errmsg=='',vim.v.errmsg)
vim.cmd('qa!')
