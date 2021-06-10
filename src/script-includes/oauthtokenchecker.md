---
title: "OauthTokenChecker"
id: "oauthtokenchecker"
---

API Name: global.OauthTokenChecker

```js
var OauthTokenChecker = Class.create();

OauthTokenChecker.prototype = {
	initialize: function() {},

	checkRefreshTokenLifespan: function(current, previous) {
		var gr = new GlideRecord("oauth_entity");
		gr.addEncodedQuery("client_id=ff97fbb4da3313004591cc3a291b47fd^ORclient_id=5c54dc934a022300cb7946e6ec6ec172^ORclient_id=8497bdfb7a5573002f07962dec25c863^ORclient_id=0bf98863a813001046cfa356db171c54");
		gr.query();
		while(gr.next()) {
			if(gr.getValue("refresh_token_lifespan") > 8640000) {
				gs.log('For security reason, device encryption feature should not be turned off when oauth token lifespan is longer than 100 days. Check oauth_entity table and make sure all native mobile clients have refresh token lifespan set to not larger than 8,640,000, and then proceed the action');
				gs.addErrorMessage(gs.getMessage("To set this property to false, you need to decrease the refresh token lifespan of all mobile clients to less than [8,640,000]. You can do this <a href = '/nav_to.do?uri=%2Foauth_entity_list.do%3Fsysparm_query%3Dtype%3Dclient%5EORtype%3Doauth_provider%5Eclient_idINff97fbb4da3313004591cc3a291b47fd,5c54dc934a022300cb7946e6ec6ec172,8497bdfb7a5573002f07962dec25c863,0bf98863a813001046cfa356db171c54%26sysparm_first_row%3D1%26sysparm_view%3D' target='_blank'>here</a>."));
				current.setAbortAction(true);
				return;
			}
		}
	}
};

```