---
title: "AJAXAddScopes"
id: "ajaxaddscopes"
---

API Name: global.AJAXAddScopes

```js
var AJAXAddScopes = Class.create();
AJAXAddScopes.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	addScopes:function() {
		var entity = new GlideRecord('oauth_entity');
		if (entity.canCreate()) {
			var builder = new SNC.OAuthEntityBuilder(entity);
			builder.addAllScopesToEntityProfile(this.getParameter('sysparm_oauthEntityId'));
		} else {
			gs.error("Access denied. Unable to add all scopes to profile.");
		}
	},
	updateScopes:function() {
		var entity = new GlideRecord('oauth_entity');
		if (entity.canCreate()) {
			var builder = new SNC.OAuthEntityBuilder(entity);
			builder.updateScopes(this.getParameter('sysparm_scopes'), this.getParameter('sysparm_oauthEntityId'));
		} else {
			gs.error("Access denied. Unable to add update scopes.");
		}
	}
});
```