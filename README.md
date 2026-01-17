# hellshake-yano.vim

A Neovim/Vim plugin for seamless word-based cursor movement

## Overview

hellshake-yano.vim is a Neovim/Vim plugin that enables seamless cursor movement between words.

It fully supports UTF-8 encoding and properly handles Japanese characters, making word-based navigation in Japanese text as smooth as in English.

### Implementation

This plugin currently ships with one implementation:

- **Denops Edition** (Neovim + Denops): Full-featured TypeScript implementation

### Demo

**Cursor move**

![move-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/move-hint.gif?raw=true)

**Visual select**

![visual-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/visual-hint.gif?raw=true)



## Features

- **Seamless Cursor Movement**: Navigate between words with standard vim motions (h, j, k, l, w, b, e)
- **Mixed Text Support**: Works with Japanese/English mixed text
- **Customizable Precision**: Adjustable word detection algorithms for different use cases
- **Visual Mode Optimization**: Intelligent hint placement for natural word selection in visual mode
- **Dictionary System**: Built-in and user-defined dictionaries for improved Japanese word segmentation
- **Continuous Hint Loop**: Optional mode that recenters the cursor and redraws hints automatically after each jump
- **Multi-Window Mode**: Display hints across all visible split windows and jump between them with a single selection

## Installation

### Using vim-plug

```vim
Plug 'nekowasabi/hellshake-yano.vim'
```

### Using lazy.nvim

```lua
{
  'nekowasabi/hellshake-yano.vim',
  config = function()
    -- Configuration here
  end
}
```

## Denops Edition (Full-Featured Implementation)

### Requirements

- Neovim or Vim 8.2+
- Deno runtime
- Denops runtime: https://github.com/vim-denops/denops.vim

**Installation of denops.vim:**

Using vim-plug:
```vim
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/hellshake-yano.vim'
```

Using lazy.nvim:
```lua
{
  'vim-denops/denops.vim',
  lazy = false,
},
{
  'nekowasabi/hellshake-yano.vim',
  dependencies = { 'vim-denops/denops.vim' },
  config = function()
    -- Configuration here
  end
}
```

## Configuration

The plugin can be configured using the `g:hellshake_yano` dictionary variable. All available options:

### Configuration Options

| Option                          | Type        | Default         | Description                                                    |
| ------------------------------- | ----------- | --------------- | -------------------------------------------------------------- |
| `markers`                       | array       | A-Z split       | Characters used as hint markers                                |
| `motionCount`                   | number      | 3               | Number of motions before hints appear (legacy)                 |
| `defaultMotionCount`            | number      | undefined       | Default motion count for unspecified keys                      |
| `perKeyMotionCount`             | dict        | {}              | Per-key motion count settings                                  |
| `motionTimeout`                 | number      | 2000            | Motion count timeout (milliseconds)                            |
| `hintPosition`                  | string      | 'start'         | Position to display hints ('start', 'end', or 'both')          |
| `triggerOnHjkl`                 | boolean     | v:true          | Enable triggering on hjkl movement                             |
| `countedMotions`                | array       | []              | Custom motion keys to track (overrides triggerOnHjkl)          |
| `enabled`                       | boolean     | v:true          | Enable/disable plugin                                          |
| `singleCharKeys`                | array       | ASDFGHJKLNM0-9  | Keys used for single-character hints (supports symbols)        |
| `multiCharKeys`                 | array       | BCEIOPQRTUVWXYZ | Keys used for multi-character hints                            |
| `useHintGroups`                 | boolean     | v:true          | Enable hint group functionality                                |
| `useNumbers`                    | boolean     | v:true          | Allow number keys in hints                                     |
| `directionalHintFilter`         | boolean     | v:false         | Limit hints to the cursor direction when pressing `j` / `k`    |
| `useNumericMultiCharHints`      | boolean     | v:false         | Enable 2-digit numeric hints (01-99, 00)                       |
| `maxSingleCharHints`            | number      | -               | Optional: Limit single-character hints                         |
| `useJapanese`                   | boolean     | v:true          | Enable Japanese word detection                                 |
| `highlightHintMarker`           | string/dict | 'DiffAdd'       | Hint marker highlight                                          |
| `highlightHintMarkerCurrent`    | string/dict | 'DiffText'      | Current hint marker highlight                                  |
| `suppressOnKeyRepeat`           | boolean     | v:true          | Suppress hints during fast key repeat                          |
| `keyRepeatThreshold`            | number      | 50              | Key repeat detection threshold (ms)                            |
| `keyRepeatResetDelay`           | number      | 300             | Reset delay after key repeat (ms)                              |
| `perKeyMinLength`               | dict        | {}              | Set minimum word length per key                                |
| `defaultMinWordLength`          | number      | 2               | Default minimum word length for hints                          |
| `bothMinWordLength`             | number      | 5               | Minimum word length for both-side hints (when hintPosition='both') |
| `segmenterThreshold`            | number      | 4               | Minimum characters to use TinySegmenter (camelCase)            |
| `japaneseMergeThreshold`        | number      | 2               | Maximum characters for particle merging (camelCase)            |
| `debugMode`                     | boolean     | v:false         | Enable debug mode                                              |
| `performanceLog`                | boolean     | v:false         | Enable performance logging                                     |
| `continuousHintMode`            | boolean     | v:false         | Enable automatic recenter + redraw loop after each hint jump   |
| `recenterCommand`               | string      | `"normal! zz"` | Command used to recenter the cursor during continuous mode     |
| `maxContinuousJumps`            | number      | 50              | Safety cap that stops the loop after the specified jump count  |
| `multiWindowMode`               | boolean     | v:false         | Enable multi-window hint display mode                          |
| `multiWindowExcludeTypes`       | array       | ['help', 'quickfix', 'terminal', 'popup'] | Buffer types to exclude from multi-window hints |
| `multiWindowMaxWindows`         | number      | 4               | Maximum number of windows to show hints in                     |


### Configuration Examples

Standard configuration:
```vim
let g:hellshake_yano = {
      \ 'useJapanese': v:false,
      \ 'useHintGroups': v:true,
      \ 'highlightSelected': v:true,
      \ 'useNumericMultiCharHints': v:true,
      \ 'enableTinySegmenter': v:false,
      \ 'singleCharKeys': 'ASDFGNM@;,.',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
      \ 'highlightHintMarker': {'bg': 'black', 'fg': '#57FD14'},
      \ 'highlightHintMarkerCurrent': {'bg': 'Red', 'fg': 'White'},
      \ 'perKeyMinLength': {
      \   'w': 3,
      \   'b': 3,
      \   'e': 3,
      \ },
      \ 'defaultMinWordLength': 3,
      \ 'perKeyMotionCount': {
      \   'w': 1,
      \   'b': 1,
      \   'e': 1,
      \   'h': 2,
      \   'j': 2,
      \   'k': 2,
      \   'l': 2,
      \ },
      \ 'motionCount': 3,
      \ 'japaneseMinWordLength': 3,
      \ 'segmenterThreshold': 4,
      \ 'japaneseMergeThreshold': 4,
      \ }
```

**Enable directional hints for `j` / `k`:**
```vim
let g:hellshake_yano.directional_hint_filter = v:true
" CamelCase alternative:
let g:hellshake_yano.directionalHintFilter = v:true
```

**Optimal for Japanese development:**
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,    " Visual selection - all characters
\     'f': 1,    " Character search - all characters
\     'w': 3,    " Word motion - meaningful words only
\     'e': 2     " Word end - balanced precision
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

**Performance optimized:**
```vim
let g:hellshake_yano = #{
\   maxHints: 50,
\   cacheSize: 3000,
\   debounceDelay: 30,
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 80,
\   enableDebug: v:false
\ }
```

**Continuous hint loop:**
```vim
let g:hellshake_yano = #{
\   continuousHintMode: v:true,
\   recenterCommand: 'normal! zz',
\   maxContinuousJumps: 25
\ }
" Optional: keep the loop short when working in focused buffers
```

**Multi-window mode:**
```vim
let g:hellshake_yano = #{
\   multiWindowMode: v:true,
\   multiWindowExcludeTypes: ['help', 'quickfix', 'terminal', 'popup'],
\   multiWindowMaxWindows: 4
\ }
" Jump to words in any visible split window with a single hint selection
```

### Per-Key Minimum Word Length Settings

Set different minimum word lengths for different keys to optimize hint display based on motion type and context.

Keys defined in `perKeyMinLength` are **automatically mapped** - no need to manually set `countedMotions`.

This feature provides fine-grained control that allows:

- **Precise movement** with visual mode keys (1-character hints)
- **Noise reduction** with hjkl navigation (2+ character hints)
- **Customized thresholds** for different motion types
- **Automatic key mapping** for all configured keys

#### Basic Configuration

```vim
let g:hellshake_yano = #{
\   perKeyMinLength: #{
\     'v': 1,   " Visual mode - precise movement
\     'V': 1,   " Visual line mode
\     'w': 1,   " Word forward
\     'b': 1,   " Word backward
\     'h': 2,   " Left
\     'j': 2,   " Down
\     'k': 2,   " Up
\     'l': 2,   " Right
\     'f': 3,   " Character search
\     'F': 3,   " Character backward search
\   },
\   defaultMinWordLength: 2,
\   motionCount: 3   " Trigger hints after 3 motions
\ }
" Note: Keys in perKeyMinLength are automatically mapped!
" No need to set countedMotions separately.
```

### Hint Position Settings

Control where hints are displayed on words using the `hintPosition` option.

#### Available Options

- **`'start'`** (default): Display hints at the beginning of words
- **`'end'`**: Display hints at the end of words
- **`'both'`**: Display hints at both the beginning and end of words

#### Both-Side Hints with Word Length Threshold

When using `hintPosition: 'both'`, you can use `bothMinWordLength` to prevent hint overlap on short words:

- Words **longer than or equal to** `bothMinWordLength` show hints at both ends
- Words **shorter than** `bothMinWordLength` automatically fall back to single-side hints (start position)
- **Default value**: `5` characters (can be customized)
- **Fallback behavior**: Short words use start-position hints to avoid visual clutter

**Basic Configuration:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 5,  " Threshold for both-side hints (default: 5)
\   defaultMinWordLength: 2
\ }
```

**Lua Configuration (for Neovim):**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 5,  -- Threshold for both-side hints (default: 5)
  defaultMinWordLength = 2
}
```

**How it works:**
- `"Hello"` (5 chars) → hints at both start and end: `H`ell`o`
- `"vim"` (3 chars) → hint at start only (fallback): `v`im
- `"JavaScript"` (10 chars) → hints at both ends: `J`avaScrip`t`
- `"a"` (1 char) → hint at start only (fallback): `a`

**Advanced Example - Optimized for Code Navigation:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 6,      " Both-side hints for 6+ character words
\   defaultMinWordLength: 3,   " Show hints for 3+ character words
\   perKeyMinLength: #{
\     'w': 4,   " Word motion - meaningful words only
\     'v': 2,   " Visual mode - more precise hints
\   },
\   perKeyMotionCount: #{
\     'w': 1,   " Show hints immediately on word motion
\     'v': 1    " Show hints immediately in visual mode
\   }
\ }
```

**Lua Configuration (for Neovim):**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 6,      -- Both-side hints for 6+ character words
  defaultMinWordLength = 3,   -- Show hints for 3+ character words
  perKeyMinLength = {
    w = 4,   -- Word motion - meaningful words only
    v = 2,   -- Visual mode - more precise hints
  },
  perKeyMotionCount = {
    w = 1,   -- Show hints immediately on word motion
    v = 1    -- Show hints immediately in visual mode
  }
}
```

**Relationship with Other Settings:**

| Setting | Purpose | Interaction with `bothMinWordLength` |
|---------|---------|--------------------------------------|
| `defaultMinWordLength` | Minimum length to show any hints | Applied before `bothMinWordLength` check |
| `perKeyMinLength` | Per-key minimum word length | Takes precedence over `defaultMinWordLength` |
| `bothMinWordLength` | Threshold for both-side hints | Only applies when `hintPosition: 'both'` |

**Common Use Cases:**

1. **Long variable names** (default: `bothMinWordLength: 5`)
   - Best for codebases with descriptive naming (e.g., `getUserAccountDetails`)
   - Both-side hints help identify long identifiers quickly

2. **Short function names** (recommended: `bothMinWordLength: 3`)
   - Suitable for terse codebases (e.g., `map`, `get`, `set`)
   - Lower threshold provides more both-side hints

3. **Mixed content** (recommended: `bothMinWordLength: 6-8`)
   - Documentation with prose and code snippets
   - Higher threshold reduces visual noise in narrative text

**Note:** `bothMinWordLength` is only effective when `hintPosition` is set to `'both'`. If unset, defaults to `5`. When `hintPosition` is `'start'` or `'end'`, this setting is ignored.

### Dictionary System

The plugin supports both built-in and user-defined dictionaries to improve Japanese word segmentation and hint placement.

#### Built-in Dictionary

The plugin includes a comprehensive dictionary containing:
- **80+ Japanese programming terms**: Function definitions, asynchronous processing, database connections, etc.
- **Common compound words**: Automatically preserved during segmentation
- **Particle merging rules**: Intelligent handling of Japanese particles ("no", "wo", "ni", etc.)

#### User-Defined Dictionary

Create custom dictionaries for your specific needs. The plugin searches for dictionary files in this order:

1. `.hellshake-yano/dictionary.json` (project-specific)
2. `hellshake-yano.dict.json` (project root)
3. `~/.config/hellshake-yano/dictionary.json` (global)

**Setup**:
```bash
# For project-specific dictionary
cp samples/dictionaries/dictionary.json .hellshake-yano/dictionary.json
```

> **Note**: `.hellshake-yano/dictionary.json` is included in `.gitignore`. Sample dictionaries are available in `samples/dictionaries/`.

#### Dictionary Format

**JSON format** (recommended):
```json
{
  "customWords": ["machine learning", "deep learning"],
  "preserveWords": ["HelloWorld", "getElementById"],
  "mergeRules": {
    "no": "always",
    "wo": "always"
  },
  "hintPatterns": [
    {
      "pattern": "^-\\s*\\[\\s*\\]\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "First character of checkbox"
    }
  ]
}
```

**YAML format**:
```yaml
customWords:
  - machine learning
  - deep learning
hintPatterns:
  - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**Simple text format**:
```
# Custom words
machine learning
deep learning

# Preserve words (! prefix)
!HelloWorld
!getElementById

# Hint patterns (@ prefix: priority:pattern:position)
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### Hint Pattern Matching

Define regex patterns to prioritize hint placement for specific document structures:

- **Checkboxes**: `- [ ] Task` → Hint on "T"
- **Numbered lists**: `1. Item` → Hint on "I"
- **Markdown headers**: `## Title` → Hint on "T"
- **Double angle quotes**: `<<Content>>` (commonly used in Japanese typography) → Hint on first character

#### Dictionary Commands

```vim
:HellshakeYanoReloadDict    " Reload dictionary
:HellshakeYanoEditDict      " Edit dictionary file
:HellshakeYanoShowDict      " Show current dictionary
:HellshakeYanoValidateDict  " Validate dictionary format
```

#### Configuration

```vim
let g:hellshake_yano = {
  \ 'dictionaryPath': '~/.config/my-dict.json',
  \ 'useBuiltinDict': v:true,
  \ 'dictionaryMerge': 'merge'
  \ }
```

### Japanese Word Segmentation Settings

hellshake-yano.vim provides advanced Japanese word segmentation (wakachi-gaki) features using TinySegmenter and particle merging. These settings allow you to fine-tune how Japanese text is analyzed and word boundaries are detected.

#### Configuration Keys


| Feature | Configuration Key | Default | Description |
|---------|-------------------|---------|-------------|
| TinySegmenter threshold | `segmenterThreshold` | `4` | Minimum characters to use TinySegmenter |
| Particle merge threshold | `japaneseMergeThreshold` | `2` | Maximum characters for particle merging |

#### Basic Configuration Example

**Using camelCase format**:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
\ }
```

#### Configuration Parameter Details

##### segmenterThreshold (TinySegmenter Threshold)

Controls when TinySegmenter (morphological analysis engine) is used for Japanese text analysis.

**How it works**:
- When Japanese text segments are **4 characters or more** (default), TinySegmenter is used for precise morphological analysis
- For shorter segments, faster pattern-based detection is used
- Higher value = Faster performance but lower segmentation accuracy for long words
- Lower value = More accurate segmentation but slightly slower

**Tuning guidelines**:

```vim
" Default setting
let g:hellshake_yano = #{
\   segmenterThreshold: 4,
\ }

" Precision-focused - use morphological analysis even for short words
let g:hellshake_yano = #{
\   segmenterThreshold: 2,
\ }


```

**Recommended values**:
- **2-3**: Technical documents with many compound words
- **4**: Default balanced setting
- **5-6**: General text with simpler vocabulary

##### japaneseMergeThreshold (Particle Merge Threshold)

**Purpose**: Controls particle merging behavior—when Japanese particles ("no", "wo", "ni", "ga", etc.) are merged with the preceding word.

**How it works**:
- When a particle appears after a word of **2 characters or less** (default), it is merged with the preceding word
- Example: "watashi no" is kept as one unit instead of being split into "watashi" + "no"
- Higher value = More aggressive merging, creating longer word units
- Lower value = Less merging, separating words and particles

**Tuning guidelines**:
```vim
" Minimal merging - mostly separate particles
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 1,
\ }
" Example: "watashi" "no" "hon" (3 separate words)

" Default merging - natural reading units
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 2,
\ }
" Example: "watashi no" "hon" (2 word units)

" Aggressive merging - longer context units
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 3,
\ }
" Example: "watashi no hon" (single unit if conditions are met)
```

**Recommended values**:
- **1**: Precise character-level navigation
- **2**: Default natural reading units
- **3**: Code comments where phrases should be kept together


### Per-Key Motion Count Settings

The plugin supports **per-key motion count** settings, allowing different keys to trigger hints after different numbers of presses. This enables optimal user experience for different motion types.

#### Basic Configuration

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " Visual mode - show hints immediately (1 press)
\     'V': 1,   " Visual line mode - immediate hints
\     'w': 1,   " Word forward - immediate hints
\     'b': 1,   " Word backward - immediate hints
\     'h': 3,   " Left - show hints after 3 presses
\     'j': 3,   " Down - show hints after 3 presses
\     'k': 3,   " Up - show hints after 3 presses
\     'l': 3    " Right - show hints after 3 presses
\   },
\   defaultMotionCount: 2,  " Default for unspecified keys
\   motionCount: 3          " Legacy fallback
\ }
```

#### Combining with Per-Key Minimum Length

For maximum control, you can combine per-key motion count with per-key minimum length:

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " Show hints after 1 press
\     'h': 3    " Show hints after 3 presses
\   },
\   perKeyMinLength: #{
\     'v': 1,   " Show 1-character words
\     'h': 2    " Show 2+ character words
\   },
\   defaultMotionCount: 2,
\   defaultMinWordLength: 2
\ }
```

This configuration means:

- `v` key: Show hints for all words (including 1-character) after 1 press
- `h` key: Show hints for 2+ character words after 3 presses
- Other keys: Show hints for 2+ character words after 2 presses

### Multi-Window Mode

Enable hints across all visible split windows. Jump to any word in any window with a single hint selection.

#### Basic Configuration

```vim
let g:hellshake_yano = #{
\   multiWindowMode: v:true
\ }
```

#### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `multiWindowMode` | `v:false` | Enable multi-window hint display |
| `multiWindowExcludeTypes` | `['help', 'quickfix', 'terminal', 'popup']` | Buffer types to exclude |
| `multiWindowMaxWindows` | `4` | Maximum windows to show hints in |

#### How it Works

1. When enabled, hints appear in all visible windows within the same tab
2. Selecting a hint jumps to that word, switching windows if necessary
3. Special buffers (help, quickfix, terminal, popup) are excluded by default
4. Performance is optimized for up to 4 windows (configurable)

#### Advanced Configuration

```vim
let g:hellshake_yano = #{
\   multiWindowMode: v:true,
\   multiWindowExcludeTypes: ['help', 'quickfix', 'terminal', 'popup', 'nofile'],
\   multiWindowMaxWindows: 6
\ }
```

**Lua Configuration (for Neovim):**
```lua
vim.g.hellshake_yano = {
  multiWindowMode = true,
  multiWindowExcludeTypes = {'help', 'quickfix', 'terminal', 'popup'},
  multiWindowMaxWindows = 4
}
```

### Key Repeat Suppression

During fast hjkl key repeat, hint display is temporarily suppressed to keep scrolling smooth. Timing is configurable and the feature can be disabled.

- Enable/disable: `g:hellshake_yano.suppressOnKeyRepeat` (default: `v:true`)
- Repeat threshold: `g:hellshake_yano.keyRepeatThreshold` (ms) (default: `50`)
- Reset delay: `g:hellshake_yano.keyRepeatResetDelay` (ms) (default: `300`)

See configuration examples below for quick copy.

#### Numeric 2-Character Hints (New Feature)

Enable numeric 2-character hints (01-99, 00) for handling large numbers of words:

```vim
" Enable numeric multi-character hints
let g:hellshake_yano = #{
\   useNumericMultiCharHints: v:true,
\   singleCharKeys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   multiCharKeys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
\ }
```

**How it works**:
1. Single-character hints: A, S, D, F, G, H, J, K, L (9 hints)
2. Alphabetic 2-character hints: BB, BC, BE, CB, CC... (multiCharKeys combinations)
3. Numeric 2-character hints: 01, 02, 03, ..., 99, 00 (up to 100 hints)

### Advanced Highlight Settings

You can customize highlights using either highlight group names or color dictionaries.

```vim
" Use existing highlight groups
let g:hellshake_yano = #{
\   highlightHintMarker: 'Search',
\   highlightHintMarkerCurrent: 'IncSearch'
\ }

" Use custom colors with fg/bg
let g:hellshake_yano = #{
\   highlightHintMarker: {'fg': '#00ff00', 'bg': '#1a1a1a'},
\   highlightHintMarkerCurrent: {'fg': '#ffffff', 'bg': '#ff0000'}
\ }

" Mixed configuration example
let g:hellshake_yano = #{
\   markers: split('ASDFGHJKL', '\zs'),
\   motionCount: 5,
\   motionTimeout: 3000,
\   useJapanese: v:true,
\   highlightHintMarker: {'bg': '#3c3c3c'}
\ }

" Hint group configuration example
" Use home row keys for single-character hints
let g:hellshake_yano = #{
\   singleCharKeys: split('asdfghjkl', '\zs'),
\   multiCharKeys: split('qwertyuiop', '\zs'),
\   useHintGroups: v:true
\ }

" Numbers first for quick access (1-9, 0)
let g:hellshake_yano = #{
\   singleCharKeys: split('1234567890ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" Exclude numbers if preferred
let g:hellshake_yano = #{
\   singleCharKeys: split('ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" Key repeat detection settings
" Disable hint display during fast key repeat (for smooth scrolling)
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:true,    " Enable/disable key repeat suppression (default: true)
\   keyRepeatThreshold: 50,          " Repeat detection threshold (milliseconds) (default: 50)
\   keyRepeatResetDelay: 300        " Delay before resetting repeat state (milliseconds) (default: 300)
\ }

" Disable key repeat suppression (always show hints)
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:false
\ }

" Custom key repeat timing
let g:hellshake_yano = #{
\   keyRepeatThreshold: 100,         " More lenient threshold for slower typing
\   keyRepeatResetDelay: 500        " Longer delay before returning to normal behavior
\ }
```

## Usage

After installation, the plugin enhances Vim's built-in word motion commands to work correctly with Japanese text. Navigate using standard Vim motions:

### Word Navigation

- `w` - Forward to the beginning of the next word
- `b` - Backward to the beginning of the previous word
- `e` - Forward to the end of the current/next word

These motions correctly recognize Japanese word boundaries, allowing you to jump between words in Japanese text just as smoothly as in English.

### Commands

#### Basic Commands

- `:HellshakeEnable` - Enable the plugin
- `:HellshakeDisable` - Disable the plugin
- `:HellshakeToggle` - Toggle the plugin on/off
- `:HellshakeShow` - Show hints immediately
- `:HellshakeHide` - Hide displayed hints

## Contributing

Pull requests and issue reports are welcome.

## Inspiration
- vim-jp slack channel
- [POP TEAM EPIC](https://mangalifewin.takeshobo.co.jp/rensai/popute/)

## Author

nekowasabi
