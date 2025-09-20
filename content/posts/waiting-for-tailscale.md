+++
title = "Waiting on Tailscale"
date = 2024-08-27 12:00:00
+++

I restarted my server the other day, and I realized one of my systemd services failed to start on boot because the
[Tailscale] IP address was not assignable:

```text
# journalctl -u bad-bad-not-good.service
...
listen tcp 100.11.22.33:8080: bind: cannot assign requested address
```

This is easy enough to fix. The service should wait to start until after Tailscale is online, so let's just add
`tailscaled.service` to the the service's `wants` and `after` properties, reboot, and...

```text
# journalctl -u bad-bad-not-good.service
...
listen tcp 100.11.22.33:8080: bind: cannot assign requested address
```

Huh. It turns out Tailscale comes up a bit before its IP address is available. I was tempted to add an `ExecStartPre`
to my service to sleep for 1 second -- gross! -- but eventually I found systemd's fabulous
[`systemd-networkd-wait-online`][systemd-networkd-wait-online] command, which exits when a given interface has an IP
address. Call it with `-i [interface name]` and either `-4` or `-6` to wait for an IPv4 or IPv6 address.

Wrapping it up into a service gives you something like this:

```ini
# tailscale-online.service
[Unit]
Description=Wait for Tailscale to have an IPv4 address
Requisite=systemd-networkd.service
After=systemd-networkd.service
Conflicts=shutdown.target

[Service]
ExecStart=/usr/lib/systemd/systemd-networkd-wait-online -i tailscale0 -4
RemainAfterExit=true
Type=oneshot
```

Services using your Tailscale IP address can now depend on `tailscale-online`.

[Tailscale]: https://tailscale.com/
[systemd-networkd-wait-online]: https://www.freedesktop.org/software/systemd/man/latest/systemd-networkd-wait-online.service.html
