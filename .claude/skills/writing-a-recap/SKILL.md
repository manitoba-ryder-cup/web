---
name: writing-a-recap
description: Write a session recap for the news section from the cup's own results, and publish it
---

# Writing a recap

A recap goes out unsigned, about people who will read it and see each other next year.
It should be funny the way the player bios are funny — at the golf, warmly, never at the person.
Everything below exists to keep the jokes downstream of the record.

## First, refuse an unfinished session

Check `finished` on every match in the session. If one is still out, say so and stop. A recap of a
session that has not ended is wrong by the time it publishes.

## Where the facts come from

Production needs no credentials:

```sh
BASE=https://manitobarydercup.com/api/scorecard/v1
curl -s "$BASE/tournaments"                    # every cup; the current one is last by start_date
curl -s "$BASE/tournaments/$CUP/results"       # every match: sides, players, hole_results, outcome
curl -s "$BASE/tournaments/$CUP/teams"         # colours, captains, points
curl -s "$BASE/tournaments/$CUP/players"       # tier and the bios
curl -s "$BASE/matches/$MATCH/scores"          # strokes per player per hole
```

A session is the matches sharing a day and a format, which is the grouping `groupIntoSessions` in
`src/lib/sessions.ts` applies. Ask which one if two finished the same day.

## What the data will tell you

Names, spelled as the API spells them. Which side each player was on. The format. Who won and by
what margin — `lead` with `holes_remaining`, rendered as `resultText` renders it: "3 & 2", "1 UP",
"TIED". Points each side took, in halves.

**A closed-out margin always takes the ampersand.** "5 & 3", never "five and three": it is a
scoreline, and spelling it out makes the same result look like two different things in one article.
A margin in holes is ordinary prose and reads as such — "four up after ten", "got out one up".

**Walk the holes, do not read the margin.** `hole_results` is one entry per hole, a team id or null
for a halved hole. The drama is in the running state: a one up that was square with three to play
is a better story than a one up that led all day, and the margin cannot tell the two apart.

**In fourball, find out whose ball won the hole.** `/v1/matches/$MATCH/scores` gives strokes per
player per hole. The team's score is the better ball and it predicts the hole winner exactly, so
"McDonald won the fourth, fifth and sixth" is a fact, not a guess. Where both players matched the
winning score the side won it and neither man did. Where a format scores once for the team —
`scores_per_player` is false — there is nothing to attribute and you must not.

Check that flag rather than the payload. A one-ball format still returns `player_scores`, holding
the team's score against both names, so an attribution pass reports every hole as shared by the
pair. That is an artefact of the shape, not a finding about the golf.

This is the richest seam in the data and the only way to see that a partner was carried. It costs
one request per match, six for a session.

**The running score is not `teams[].points`.** That field is the cup total, so on a finished cup it
is the final score and never the score after session one. Add up the sessions played so far.

**Nobody gets strokes.** Everyone plays off scratch; the tier levels the field, and a tier is a
tee-box colour — the colour is the name. In fourball and singles a player drawn against a different
tier plays from shorter or longer tees; in scotch and alt shot everyone plays the same tees and the
sides are matched to be about equal instead. So a handicap never explains a hole, and `hdcp` is not
a stroke allowance — it is 0 for seven of twenty-five players in 2025 across all three tiers, which
means unrecorded. Never build a line on that number.

**Never invent.** No quotes. No weather. No crowd. No nerves, no momentum, no what-anyone-was-
thinking. If it is not in a response or a bio, it does not go in.

## The bios

They are where the voice comes from, and where you learn who these people are to each other. Read
them before writing anything.

Bios are **per cup**, and the cup being played usually has none — 2026 had zero the week before it
started. Take this cup's bio, and when it is empty read the most recent earlier cup that has one,
which is a single request for that cup's whole field rather than one per player. A bio sits under
the year it was written for, so a fallback is describing that year and not this one.

**A bio is characterisation, not evidence.** Its jokes are not facts — a new putter in a write-up is
a gag, not equipment you can report. Neither are its dated claims: "reigning MVP" in a 2024 bio
means reigning in 2024, and carrying that into a report on 2025 is how a man who won it in 2023 gets
called the current champion. Take what endures — how somebody plays, what they are ribbed for, who
they are to the group.

**Prefer the record to the bio.** Where a bio makes a claim the results can settle — who captained,
who won, what somebody's record was — go and check, then cite the record. A bio saying a player
captained a winning side a year ago is worth far less than the results saying he won it by a single
point.

**Never say that you read them.** No "his bio says", no "according to his write-up". Write as
somebody who already knows these people, because the reader does.

**Do not borrow a bio's wording.** Take what it tells you and write your own line. A phrase built
for one joke usually breaks in another — a bio saying somebody has been "handing out doubles" works
there and is not how anybody describes a scorecard anywhere else.

## What has already been published

Read `src/content/news/` before writing. Four recaps over one weekend will otherwise open the same
way and reach for the same beats. Do not repeat an opening, a structure, or a joke that is in one.

## Writing it

**Every match gets a story, not a mention.** They do not get equal room — spend the words where the
golf was interesting — but a scoreline and a shrug is not a story. If a match looks like it has
nothing to say, walk its holes again: the shrug almost always means the margin was read and the
round was not. The dullest-looking match is where an error hides, because nothing in a shrug can be
checked.

**Be ruthless, and be funny about it.** Somebody caused the four-hole swing and it is fair to name
them. A squandered four-up lead is a collapse, not bad luck. A captain losing 5 & 3 is worth more
words than a captain winning by the same. The test of a line is whether it is funny, not whether it
is kind — these are the same people who write the bios about each other.

The line it must not cross is contempt: a joke that only works if the reader already dislikes
somebody is not a joke. Nothing outside the golf is in scope — not anyone's work, family or health.

**Specificity does the work, not adjectives.** "Won the third and the tenth and nothing else" is
more brutal than any insult available, and it is a fact. Reach for the number, the hole, the run. A
line of atmosphere is welcome once the facts have earned it; what is not welcome is adjectives
standing in for facts, which is the first thing a writer told to be savage reaches for.

**Count things the reader can count.** "Two of them were self-inflicted" is not a sentence anybody
can check — two of what, out of how many? Name the set first.

**Say a pattern once, about the session.** When the same observation holds in four matches it is one
fact about the morning, not four about individuals. Name it once and let each paragraph get on with
its own story; repeating a strong line in every one is how it turns into a tic.

**Vary how paragraphs open**, within a recap as much as between them. Five that begin with two
names, a position and an outcome read as a table with sentences around it. Open one on the hole, one
on the number, one on the situation.

**There is no minimum, and nothing is ever padded to reach one.** Six matches told properly come in
somewhere around 400 words; stay under about 650. A quiet session is shorter than a dramatic one and
should be. If a draft feels thin, the fix is a match whose story was not told, never more words about
the ones that were.

Short sentences. The result first, the colour second. Surnames after first mention. Do not write a
headline the scoreboard already says better, and keep it under about forty characters — longer and
it wraps onto a second line on the card that carries it.

## Singles is a different shape

Twelve matches, not six, and they do not all matter. Work out what each side needed before the
session started — the running total against the majority — and let that decide the shape of the
piece. In 2025 Blue went into the singles needing four and a half points from twelve and won eight;
the cup was gone long before the last group came in.

Give whole paragraphs to the matches that carried it over the line, the closest ones, and the ones
worth reading about for their own sake. Group the rest: a clause each, or one paragraph covering
several by result. Every match still appears — nobody is left out of the record — but a dead rubber
does not get the room a decisive match gets. If it goes to the last groups, as 2024 did, the
emphasis inverts and the end of the draw is the story.

The singles recap is where a player's whole week gets summed up, so it is where a record miscounted
from the sessions you happened to recap will end up in a headline. Count from the results.

**Do not name the match that clinched it unless the arithmetic leaves no doubt.** Finish times are
not in the data and tee order is not finish order — a 6 & 5 is over long before an eighteen-hole
match that teed off two groups ahead of it. Say what each side needed and what they got, which is
exact, rather than which green it was settled on, which is a guess.

## How to end it

Close with where it leaves the cup: the score, the points still available, and what each side needs
— there are `len(results)` points in all, so a majority is half of them plus a half. Say which
format is out next. Do not invent what a team should work on; the arithmetic and the draw are the
look ahead.

**The last session ends differently.** There is no next format to point at, so say who won the cup
and by what margin, and let the closing line be about the week rather than the afternoon.

## The file

`src/content/news/<published_at>-<what-it-is>.md`, so `2026-09-18-friday-fourball.md`. The slug is
the filename, so there is none in the frontmatter.

```markdown
---
title: Blue take the morning
summary: One sentence for the card on the homepage and the list.
published_at: 2026-09-18T13:00
cup: 2026
---

Body in markdown. Headings, emphasis, lists and links only.
```

Every field is required and the build fails without them. `published_at` carries a time as well as
a date: two sessions go out most days, so the date alone cannot say which recap is the newer, and
the list is ordered newest first. Only the date is ever displayed. `cup` is the year, not a tournament id —
ids differ between environments and a year does not.

## Check it before you show it

The draft gets one review and it is Travis's. Do not spend it on anything findable here first.

**Walk every number back to the source.** Every hole named, every margin, every running state,
re-derived from the data rather than re-read from the draft. Prose that reads well hides arithmetic
that is wrong: a pair once described here as never looking like they would recover had in fact won
the seventeenth and stood on the last needing it to halve the match.

**Check every name against the session's lineups**, spelled as the API spells it.

**A claim about somebody's week counts every session, not the ones you wrote up.** Pull that
player's whole record from the results before saying it — how many they played, how many they lost.
Writing three recaps and then calling a man's record from those three is how a captain who lost
three of four became one who lost all three, and how the only player who did lose everything went
uncounted.

**Check the match count before the word count.** Every match in the session has its own paragraph.
A short draft is a symptom, not a fault: look for two matches sharing a paragraph, and if every one
has its story then the length is right and the session was quiet. Never add words to reach a
number.

**Then read it once looking for each of these**, all of which have gone wrong in practice:

- a count with no set — "two of them" where the reader cannot tell two of what
- a callback the reader cannot follow — "again", "still", "another one" lean on something they have
  already read, so it has to be in a published recap and not just in your head
- an observation repeated in four paragraphs that belongs once to the session
- two paragraphs that open the same way
- a bio's joke stated as fact, or a bio's phrasing borrowed whole
- commentary with nothing behind it — "worth more to Red", "a deficit rather than a problem". An
  inference is fine when the figures carrying it sit in the same breath: turning "one point apart
  after the opening day" into "a margin that suggests it was never close" earns itself
- a match given a scoreline instead of a story
- a line that only works if the reader already dislikes somebody

## Publishing

**This section is the part that changes.** When a blog service owns articles the draft goes to an
endpoint and a human promotes it; everything above stays as it is.

1. Write the file.
2. **Show the draft in full and wait.** Never commit a recap that has not been read back. It is the
   only review it gets.
3. On approval: commit to master, tag a patch version, push both. The release runs the whole gate
   before deploying, so a broken article fails the release rather than the site.

```sh
git add src/content/news && git commit -m "feat(web): publish the <session> recap"
git tag -a vX.Y.Z -m "<title>" && git push origin master && git push origin vX.Y.Z
```
