---
title: "FindValidLandingPagePlaceholder"
id: "findvalidlandingpageplaceholder"
---

API Name: global.FindValidLandingPagePlaceholder

```js
var LANDING_PAGE_PLACEHOLDER_NAME = 'Landing Page Placeholder';

function searchValidPlaceholderParents(elementPageRegistryId) {
     // PLACEHOLDER PARENTS THAT HAVE SAME PAGE REGISTRY AND SINGLE APPLICABILITY AS THIS ELEMENT
	var parentsWithTargetPageRegistry = [];
	var placeholderGr = new GlideRecord('sys_ux_content_placeholder_elem');
	placeholderGr.query();
	while (placeholderGr.next()) {
		var currentParentElementGr = placeholderGr
			.getElement('parent')
			.getRefRecord();
		var currentParentPageRegistry = currentParentElementGr
			.getElement('applicable_page');
		if (!currentParentPageRegistry) {
			continue; 
		}
		var currentParentApplicability = currentParentElementGr
			.getElement('applicability') + '';
		var currentParentSysId = currentParentElementGr
			.getUniqueValue() + '';
		var currentParentPageRegistryStr = currentParentPageRegistry + '';
		var currentParentApplicabilityStr = currentParentApplicability + '';

		if (currentParentPageRegistryStr === elementPageRegistryId && currentParentApplicabilityStr === 'single') {
			parentsWithTargetPageRegistry.push(currentParentSysId);
		}
	}
	return parentsWithTargetPageRegistry;
}

function getLandingPagePlaceholders(parents) {
	var placeholders = [];
	var placeholderGr = new GlideRecord('sys_ux_content_placeholder_elem');
	placeholderGr.addQuery('parent', 'IN', parents.join(','));
	placeholderGr.query();
	while(placeholderGr.next()) {
		if (placeholderGr.getDisplayValue() === LANDING_PAGE_PLACEHOLDER_NAME) {
			placeholders.push(placeholderGr.getUniqueValue());			
		}
	}
	return placeholders;
}

var FindValidLandingPagePlaceholder = Class.create();
FindValidLandingPagePlaceholder.prototype = {
    initialize: function() {
    },
	getValidLandingPagePlaceholderName: function() {
		return LANDING_PAGE_PLACEHOLDER_NAME;
	},
	getValidLandingPagePlaceholder: function(pageRegistryId) {
		var elementsWithSamePageRegistry = searchValidPlaceholderParents(pageRegistryId);
		var validLandingPagePlaceholders = getLandingPagePlaceholders(elementsWithSamePageRegistry);
		if (validLandingPagePlaceholders.length > 0) {
			return validLandingPagePlaceholders[0];
		}
		return null;
		
	},
	isValidLandingPagePlaceholder: function(placeholderId, pageRegistryId, applicability) {
		if (applicability !== 'single') {
			return true;
		}
		var validLandingPagePlaceholderId = this.getValidLandingPagePlaceholder(pageRegistryId);
		if (placeholderId === validLandingPagePlaceholderId) {
			return true;
		}
		return false;
	},

    type: 'FindValidLandingPagePlaceholder'
};
```