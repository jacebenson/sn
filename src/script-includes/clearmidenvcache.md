---
title: "clearMIDEnvCache"
id: "clearmidenvcache"
---

API Name: global.clearMIDEnvCache

```js
function clearMIDEnvCache() {
	if (gs.getProperty("mid.com.snc.process_flow.integration.integration_hub_mid_caching_enabled", "false") == "true") {
		var probe = new SncProbe();
		probe.topic = "SystemCommand";
		probe.source = "environment_clear";
		probe.setEccPriority("0");
		probe.addParameter("skip_sensor", "true");
		probe.create("mid.server.*");
	}
}
```