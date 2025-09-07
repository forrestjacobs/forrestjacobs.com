+++
title = "Shell-agnostic config"
date = 2025-08-29 20:42:00
+++

<span class="caps">I love [fish](https://fishshell.com/)</span>, and I have built up my fish config over time:

```fish
# Set helix as the editor if it's available.
if type -q hx
  set -gx EDITOR hx
end

set -gx MANOPT --no-justification # Badly justified text is terrible

abbr S 'sudo systemctl'

# etc...
```

I’ve started working in environments where it’s infeasible to switch the shell from bash, but I still want to use my config. I *could* make a parallel `.bashrc` with the equivalent commands, but that’s bound to get out of date. Instead, I turned my fish config into a bash script that prints out the correct instructions for either bash or fish (a la [`brew shellenv [shell]`](https://docs.brew.sh/Manpage#shellenv-shell-) or [`zoxide init [shell]`](https://www.mankier.com/1/zoxide-init)). It looks like this:

```bash
#!/usr/bin/env bash

# init_shell: Prints instructions to configure the given shell.
# Add `eval "$(init_shell bash)"` to .bashrc to set up bash
# or `init_shell fish | source` to config.fish to set up fish.

shell=$1

# Escapes and prints the passed in string.
escape () {
  local text=$1
  text=${text//\\/\\\\}
  text=${text//\'/\\\'}
  echo "'$text'"
}

# Prints a command that sets an environment variable in $shell.
# Pass in the variable name, then the value.
p_export () {
  export "$1"="$2"
  if [[ "${shell}" = "fish" ]]; then
    echo "set -xg $(escape "$1") $(escape "$2")"
  else
    echo "export $(escape "$1")=$(escape "$2")"
  fi
}

# Prints a command that sets an abbreviation in $shell.
# Pass in the abbreviation name, then the full command.
p_abbr () {
  if [[ "${shell}" = "fish" ]]; then
    echo "abbr $(escape "$1") $(escape "$2")"
  else
    echo "alias $(escape "$1")=$(escape "$2")"
  fi
}

# Set helix as the editor if it's available.
if command -v hx &> /dev/null; then
  p_export EDITOR hx
fi

p_export MANOPT --no-justification # Badly justified text is terrible

p_abbr S 'sudo systemctl'

# etc...
```

Admittedly, this design introduces quite a bit of complexity. For example, you'll notice the `p_export` function exports the environment variable in the script before printing out the export command. This is to ensure that later commands in this script can access the environment variable the same way the shell would. You can imagine how easily the command's internal state could drift from the shell's state in subtle, difficult to debug ways.

But this additional complexity is worth it for me. My other options are to abandon or duplicate my config (yuck), or switch to bash everywhere (double-yuck). This design has been working well for me for a few weeks.
