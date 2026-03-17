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
