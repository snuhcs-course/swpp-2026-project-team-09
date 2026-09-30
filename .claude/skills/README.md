# Agent skills

The skills every agent in this repository shares. Claude Code reads this folder. `.agents/skills` links to it for Codex and the other agents that read `.agents/skills`; on Windows the link needs Git symlinks turned on (`git config core.symlinks true` with Developer Mode).

| Skills | Source | Commit |
| --- | --- | --- |
| `karpathy-guidelines` | [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) | `2c60614` |
| All the others | [mattpocock/skills](https://github.com/mattpocock/skills), the skills listed in its `.claude-plugin/plugin.json` | `d81f3a1` |

The skill folders are copied unchanged. To update them, copy the folders from a newer commit, change the commit here, and read the source's changelog for changes the repository has to follow, such as a renamed file.

mattpocock/skills is MIT licensed; its license is in `LICENSE-mattpocock-skills`. forrestchang/andrej-karpathy-skills states the MIT license in its README and in the skill's front matter.
