---
title: "Auth_IsScopeInDefaultProfile"
id: "auth_isscopeindefaultprofile"
---

API Name: global.Auth_IsScopeInDefaultProfile

```js
var Auth_IsScopeInDefaultProfile = Class.create();
Auth_IsScopeInDefaultProfile.prototype = {
    checkScope:function(current) {
		var profile = new GlideRecord('oauth_entity_profile');
		profile.addQuery('oauth_entity', current.oauth_entity);
		profile.addQuery('default', true);
		profile.query();
		
		if (profile.next()) {
			var defaultProfileSysId = profile.getUniqueValue();
			var scopeSysId = current.sys_id;
			
			var entity = new GlideRecord('oauth_entity');
			var builder = new SNC.OAuthEntityBuilder(entity);
			
			return builder.isScopeInDefaultProfile(scopeSysId, defaultProfileSysId);
			
		}
		return false;
	}
};
```