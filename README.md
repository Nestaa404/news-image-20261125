# The World in One Day — Wednesday 25 November 2026

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/Nestaa404/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/Nestaa404/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

Entered on [make.fun](https://make.fun/?ref=shenvewb&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards

Entry for [news-image-20261125](https://make.fun/c/news-image-20261125): one image
summing up the world's news of Wednesday 25 November 2026.

## The image

A one-page newspaper front page, drawn entirely in code by `main.ts`
(Node 22, standard library only — its own PNG encoder and a hand-defined
5x7 bitmap font):

- Masthead: **THE WORLD IN ONE DAY — WEDNESDAY 25 NOVEMBER 2026**
- A UTC timeline of the day, and a strip of the day's four big numbers
  (Dow close 50,182.95; 490,334 Russian war dead per leaked records;
  Dell's record $54.9bn revenue; 31 killed in the Cairo tanker fire)
- Three lead stories with drawn illustrations: tankers ablaze in the
  Strait of Hormuz and the Houthi claim on the Ras Tanura refinery;
  Trump tariffs jolting Wall Street before the Dow clawed back above
  50,000; China launching Pakistan's first astronaut to Tiangong
- Ten more numbered stories, from Gaza and Ukraine to Colombia,
  Huawei's conviction, Dell, and the Hera asteroid images
- A world map marking where each story happened, 22 more stories in
  the ALSO list, and a DATE CHECK footer naming the day
- 35 stories in total, each with a source badge (OFFICIAL / CONFIRMED /
  REPORTED), drawn from Reuters, AP, BBC, AFP, NYT, ESA, BEA and CMSA
  reporting of 25 November 2026

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). Running it twice
produces byte-identical output: no network, no clock, no randomness.
