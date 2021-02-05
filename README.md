# massencode
Massive flac -> mp3 conversion

**encode_mp3**: encodes 1 file to mp3

**encode_opus (deprecated)**: encode 1 file to opus format

**mass_encode.js**: wrapper over both encoders

## Usage

    node mass_encode.js [input-dir] [output-dir] mp3

  Last parameter `mp3` has a deprecated alternative `opus`.

  Creates album directory if needed.

## Dependencies

      npm install

 \+ needs packages `flac` and `lame` for your system.
