---
title: "JobTokenAuth"
id: "jobtokenauth"
---

API Name: global.JobTokenAuth

```js
var JobTokenAuth = Class.create();
JobTokenAuth.prototype = {
    initialize: function(request, response, auth_type, auth_value) {
		this.request = request;
		this.response = response;
		this.auth_type = auth_type;
		this.auth_value = auth_value;
	},

	getAuthorized: function() {
		if (this._validToken())
			return "sharedservice.worker";

		return null;
	},

	_validToken: function() {
		var token = this._getToken();
		if (gs.nil(token)) {
			return false;
		}

		var solution = new GlideRecord("ml_solution");
		solution.get("token_hash", new GlideDigest().md5_digest(token));
		if (solution.isValidRecord()) {
			return true;
		}
		return false;
	},

	_getToken: function() {
		var up = GlideStringUtil.base64Decode(this.auth_value);
		var split = up.indexOf(":");

		if (split == -1) {
			gs.log("JobToken authentication not well formed");
			return null;
		}

		var userName = up.substring(0, split);
		var token = up.substring(split + 1);
		return token;
	},

    type: 'JobTokenAuth'
};
```