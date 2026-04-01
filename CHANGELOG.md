# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-16

### Added

- Initial release
- Basic PLC connection support
- Read/Write data from a PLC
- Heartbeat support (sequence / toggle)
- Auto reconnect
- Add usage examples for `S7ClientSession` and `S7ScheduleClient`
- Update `README.md` and `doc/session.md` with `S7ClientSession` event handling examples

### Changed

- improve structured logging in S7ClientSession
- refactor logger interface to support structured log payloads

### Removed

- remove `error` event, replaced with `runtimeError`

### Fixed

- add buffer length validation in S7ScheduleClient
- clean up IOScheduler tests

## [0.2.0] - 2026-03-31

### Fixed

- corrected Snap7 error code mapping for accurate TCP error identification

### Changed

- add a retryable flag to distinguish recoverable errors
- improve retry logic in S7ClientSession
- add suppressWithTraffic flag to disable heartbeat when IO traffic is detected

## [0.2.1] - 2026-04-01

### Fixed

- add suppressWithTraffic heartbeat option for S7ClientSession
