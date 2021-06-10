---
title: "ChannelProxyInstallURLGetter"
id: "channelproxyinstallurlgetter"
---

API Name: global.ChannelProxyInstallURLGetter

```js
var ChannelProxyInstallURLGetter = Class.create();
ChannelProxyInstallURLGetter.prototype = {
    initialize: function(channel, appKey) {
		this.channel = channel;
		this.appKey = appKey;
		this.generator = new sn_channelproxy.InstallURLGenerator(this.channel, this.appKey);
		if (this.channel == 'teams')
			this.generator = this.generator.withParam('response_type', 'code');
		
		if (this.channel == 'workplace')
			this.generator = this.generator.withParam('section', 'apps');
    },
	
	getURL: function(providedId) {
		if (providedId)
			this.generator.withState('provided_external_id', providedId);
		
		var url = this.generator.getURL();
		if (this.channel == 'workplace')
			return url.replace('client_id=', 'app_id=');
		
		if (this.channel == 'teams' && providedId)
			return url.replace('/common/', '/' + providedId + '/');
			
		return url;
	},
	
	getConfirmationURL: function(externalId) {
		this.generator = this.generator
			.withState('override_existing_id', externalId);
		
		if (this.channel == 'slack')
			return this.generator.withParam('team', externalId).getURL();
		
		if (this.channel == 'teams')
			return this.generator.getURL().replace('/common/', '/' + externalId + '/');
			
		return this.generator.getURL();
	},

    type: 'ChannelProxyInstallURLGetter'
};
```