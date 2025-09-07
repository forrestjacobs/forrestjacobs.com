+++
title = "Rust to Go and back"
date = 2025-05-19 13:11:00
+++

<span class="caps">I wrote two</span> Discord bots relatively recently: [a bot called `systemctl-bot` that lets you start and stop systemd units](https://github.com/forrestjacobs/systemctl-bot), and [a bot called `pipe-bot` that posts piped messages](https://github.com/forrestjacobs/pipe-bot). I attempted to write both in Rust, and while one was a delight to write, the other I ended up rewriting in Go in a fit of frustration. Here are a few reasons why:

### Starting off too complex

`pipe-bot`, the program I successfully wrote in Rust, is very simple — it listens to standard in, then calls to the Discord API based on the message:

<figure>

```goat {label="Diagram showing the flow of execution for pipe-bot."}

                        .----------------------.
                       |  Start Discord client  |
                        '----------+-----------'
                                   |
.-- loop --------------------------|----------------------------------.
|                                  v                                  |
|                         .------------------.                        |
|                        /  Wait for stdin  /                         |
|                       '----------+-------'                          |
|                                  |                                  |
|                                  v                                  |
|                         .---------------.                           |
|                   .-----+  Parse stdin  +-----.                     |
|                  /      '--------+------'      \                    |
|                 /                |              \                   |
|            Message        Status update        Else                 |
|               /                  |                \                 |
|              v                   v                 v                |
|  .----------------.    .-----------------.    .-------------.       |
|  |  Send Message  |    |  Update status  |    |  Log Error  |       |
|  '----------------'    '-----------------'    '-------------'       |
|                                                                     |
'---------------------------------------------------------------------'
```

<figcaption>
A diagram showing the flow of execution for <code>pipe-bot</code>. After starting a Discord client, it waits for stdin, parses it, and then either sends a message, updates the Discord status, or logs an error based on the parsed message.
</figcaption>
</figure>

However, I started with `systemctl-bot`, which monitors and controls systemd units, parses and shares a config file, reads async streams, and generally has weird edge cases. While it’s not *overly* complex, it’s a lot to get your head around when you’re also learning the borrower checker and async Rust.

<figure>

```goat {label="Diagram showing the flow of execution for systemctl-bot."}
                                .--------------.
                               |  Parse config  |
                                '-------+------'
                                        |
                                        v
                            .----------------------.
                   .-------+  Start Discord client  |
                  |         '-----------+----------'
                  |                     |
                  |                     v
                  |           .-------------------.
                  |          |  Register commands  +-.
                  |           '-------------------'   |
                  |                                   |
.-- Status loop --|-------------.  .-- Command loop --|--------------------.
|                 v             |  |                  v                    |
|    .----------------------.   |  |             .-----------.             |
|   /  Unit status update  /    |  |            /  Command  /              |
|  '--------------+-------'     |  |           '-----------'               |
|                 |             |  |                  |                    |
|                 v             |  |                  v                    |
|  .-------------------------.  |  |        .------------------.           |
|  |  Fetch units' statuses  |  |  |       /                    \          |
|  '--------------+----------'  |  |      +  Is unit in config?  +         |
|                 |             |  |       \                    /          |
|                 v             |  |        '--+------------+--'           |
|  .-------------------------.  |  |          /              \             |
|  |  Update Discord status  |  |  |         No              Yes           |
|  '-------------------------'  |  |        /                  \           |
|                               |  |       v                    v          |
'-------------------------------'  | .-------------.  .------------------. |
                                   | |  Log error  |  |  Call systemctl  | |
                                   | '-------------'  '--------+---------' |
                                   |                           |           |
                                   |                           v           |
                                   |                   .----------------.  |
                                   |                   |  Post results  |  |
                                   |                   '----------------'  |
                                   '---------------------------------------'
```

<figcaption>
A diagram showing the more complex flow of execution for <code>systemctl-bot</code>. It parses a config file, starts a Discord client, and then branches off into two threads: one handling status updates, and the other handling commands (after registering them with the Discord client.) The status thread waits for unit status updates, then fetches all units' statuses and updates Discord. The command loop waits for a user command, calls <code>systemctl</code> with the appropriate arguments (provided that the targeted unit is in the config file) and then posts the results. If the unit was not in the config file it logs an error instead.
</figcaption>
</figure>

### Async Rust

I anticipated fighting with the borrower checker, but—oh boy!—it pales in comparison to writing and understanding async Rust. Since I was coming from the world of “””enterprise software”””, I was used to writing with a level of indirection to facilitate code reuse, unit testing, and refactoring. However, Rust makes you pay for indirection that involves tracking more state or more complex state since it has to track that state while the async call is in progress. Watch this video to hear [someone much smarter than me](https://fasterthanli.me/) explain why the current state of async Rust ain’t quite it yet:

{{< youtube id=bnmln9HtqEI title="Catching up with async Rust" channel="fasterthanlime" >}}

### Testing

Something possessed me to go full enterprise software sicko mode during the development of `systemctl-bot` and unit test every module to as close to 100% coverage as possible. I’m glad I did because it taught me more about generics and about Box, Rc, and Arc as I tried to find ways to mock dependencies, but it also taught me that this style of testing in Rust produces a huge glob of code that is painful to wrangle.

I decided to take a different approach while developing `pipe-bot`: I just mocked the outer edges of my program and let every test be an integration test. Any unit-level errors that mattered seem to come up in these tests, and since my program was small it wasn’t difficult to identify the specific function where the error originated. I got 99% of the benefit of unit testing with 20% of the effort.

### Final thoughts

I enjoy Rust, but I respect Go. Rust is more fun to write, and the compiler’s strict checking is a superpower that ensures you don’t screw yourself up too badly. However, async Rust is a huge pain for me, and while Go is boring, sometimes it’s the ticket to complete a project.
