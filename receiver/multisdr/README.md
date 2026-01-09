## MultiSDR

Small helper plugin for selecting among multiple SDRs in an OpenWebRX+ instance.

### Features

- Simple selector UI to switch between configured SDRs
- Works with multiple antennas and identical profiles across receivers

### Requirements

- OpenWebRX+ (a working installation)
- A set of configured SDR backends accessible to the OpenWebRX+ server
- 0xAF's utils.

## Load

Add this lines in your `init.js` file:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
await Plugins.load('https://tgcfabian.github.io/OpenWebRXPlus-Plugins/receiver/multisdr/multisdr.js');
```

### Configuration

- No configuration needed, this plugin automatically gets its data on launch.

### Usage

- Open the OpenWebRX+ web UI and use the MultiSDR selector to switch active SDRs.
- If an SDR drops out, refresh the page to re-establish the connection.

### Troubleshooting

- If an RTL-SDR or other device drops connection, refresh the browser. The plugin does attempt automatic recovery. but can not be guaranteed
- Check server logs for backend disconnects and reconfigure timeouts if necessary.

### License

This plugin follows the repository license (MIT). See the top-level `LICENSE` file for details.
