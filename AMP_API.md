# Amp (Non-Proxied) API Documentation

This document describes the API for the Luxsin X9  audio pre amplifier (Luxsin/Sinilink based). All communication is performed over HTTP directly to the device IP on port 80.

## Overview

- **Protocol**: HTTP
- **Base URL**: `http://<device-ip>/`
- **Authentication**: None
- **Data Encoding**: Most responses and some POST bodies are encoded using a custom Base64 alphabet.

### Custom Base64 Alphabet

To decode the data, translate characters from the **Custom** alphabet to the **Standard** alphabet, then perform a standard Base64 decode.

- **Custom**: `KLMPQRSTUVWXYZABCGHdefIJjkNOlmnopqrstuvwxyzabcghiDEF34501289+67/`
- **Standard**: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`

---

## Endpoints

### 1. Get Device Status
**Endpoint**: `GET /dev/info.cgi?action=syncData`

Returns the current state of the device in encoded JSON format.

**Key Fields in JSON (Decoded)**:
- `name`: Device name.
- `device`: Device model/type.
- `version`: Firmware version.
- `language`: Current UI language (0: English, 1: ZH-HK, 2: ZH).
- `volume`: Current volume (0-200).
- `input`: Current input source index (see "Update Setting" for mapping).
- `output`: Current output destination index (0: XLR, 1: RCA, 2: Headset).
- `audioFormat`: Description of current audio (e.g., "44.1kHz/16bit").
- `vu`: Current VU meter index.
- `vu_count`: Total number of available VU meter styles.
- `dsp_enable`: DSP status (0: Enabled, 1: Disabled).
- `peqEnable`: Parametric EQ status (1: Enabled, 0: Disabled).
- `audio_enable`: Audio output status (1: Enabled, 0: Disabled).
- `bt_status`: Bluetooth connection status (0: Disconnected, 1: Playing, 2: Paused).
- `bt_srcname`: Name of the connected Bluetooth device.
- `bt_title`: Title of the current track (BT source).
- `bt_artist`: Artist of the current track (BT source).
- `soundStep`: Volume increment step (e.g., 0.5).
- `msgCount`: Current state change counter.

### 2. Update Setting
**Endpoint**: `GET /dev/info.cgi?action=setting&<PARAM>=<VALUE>`

Changes a specific device setting. Multiple parameters can be combined in one request (e.g., `&volume=100&input=4`).

**Parameters**:
| Parameter | Value Range | Description |
| :--- | :--- | :--- |
| `volume` | 0 - 200 | Set system volume. |
| `input` | 0 - 6 | Change input source (0: USB, 1: USB-C, 2: Coaxial, 3: Optical, 4: Bluetooth, 5: HDMI-ARC, 6: RCA). |
| `output` | 0 - 2 | Change output destination (0: XLR, 1: RCA, 2: Headset). |
| `vu` | 0 - (vu_count-1) | Change VU meter display style. |
| `dsp_enable` | 0, 1 | Set DSP status (0: Enable, 1: Disable). |
| `audio_enable`| 0, 1 | Set audio output status (1: Enable, 0: Disable). |
| `peqEnable` | 0, 1 | Set Parametric EQ status (1: Enable, 0: Disable). |
| `peqSelect` | Index | Select a PEQ preset. |
| `bt_play` | 1 | Toggle Play/Pause (for Bluetooth sources). |
| `bt_next` | 1, 0 | Transport control (1: Next, 0: Prev). |
| `language` | 0, 1, 2 | Set device language (0: English, 1: ZH-HK, 2: ZH). |
| `lowBass` | -10 to 10 | Set bass level (if supported). |
| `enterBass` | -10 to 10 | Set mid-range level. |
| `highBass` | -10 to 10 | Set treble level. |
| `loudness` | 0, 1 | Enable (1) or disable (0) loudness compensation. |
| `balance` | -10 to 10 | Set L/R balance. |
| `tone` | 0, 1 | Enable/disable tone controls. |
| `threshold` | Value | Set dynamic threshold. |

### 3. Get PEQ Status
**Endpoint**: `GET /dev/info.cgi?action=syncPeq`

Returns detailed Parametric EQ configuration.

### 4. Change Detection (Message Counter)
**Endpoint**: `GET /msgCount`

Returns a simple integer (e.g., `42`).

**Purpose**: Lightweight polling mechanism.
- The device increments this counter whenever a state change occurs (volume change, input switch, track change, etc.).
- The client should poll this endpoint frequently (e.g., every 3 seconds).
- If the returned value differs from the last known value, the client should then call `/dev/info.cgi?action=syncData` to fetch the full updated state.
- This avoids the overhead of fetching and parsing the full JSON state when nothing has changed.

### 5. Update PEQ Configuration (Advanced)
**Endpoint**: `POST /dev/info.cgi`
**Body**: `json=<ENCODED_JSON>`

Updates multiple PEQ filters at once. The JSON contains a `peqChange` object with an array of `filters`.

**Filter Properties**:
- `fc`: Frequency (Hz).
- `gain`: Gain (dB).
- `q`: Q-factor.
- `type`: Filter type index:
    - `0`: Low Pass
    - `1`: High Pass
    - `2`: Band Pass
    - `3`: Notch
    - `4`: Peak
    - `5`: Low Shelf
    - `6`: High Shelf
    - `7`: All Pass

---

## WiiM Integration (Reference)

While the Amp is controlled directly, this application also interacts with WiiM devices via their HTTP API:
- **Status**: `GET /httpapi.asp?command=getPlayerStatus`
- **Metadata**: `GET /httpapi.asp?command=getMetaInfo`
- **Transport**: `GET /httpapi.asp?command=setPlayerCmd:<cmd>` (e.g., `onepause`, `next`, `prev`).
