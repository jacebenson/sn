---
title: "UxPageElementInvariants"
id: "uxpageelementinvariants"
---

API Name: global.UxPageElementInvariants

```js
var UxPageElementInvariants = Class.create();
UxPageElementInvariants.prototype = {
    initialize: function(elemRecord) {
		this.elem = elemRecord;
    },
	
	treeRootDefaultValue: function () {
		if (gs.nil(this.elem.parent))
			return '';
		if (!!this.elem.parent.is_root)
			return this.elem.parent + '';
		if (gs.nil(this.elem.parent.tree_root))
			return '';
		return this.elem.parent.tree_root + '';
	},
	
	treeRootRefQual: function () {
		var defaultVal = this.treeRootDefaultValue();
		if (gs.nil(defaultVal))
			return '';
		return 'sys_id=' + defaultVal;
	},
	
	/**
	 * abort - function to call if we want to abort the action
	 * warn  - function to call (takes msg arg) if we want to surface the abort reason
	 */
	rootVsParentFields: function (abort, warn) {
		abort = abort || function(){};
		warn = warn || function(){};
		
		if (this.elem.sys_class_name == 'sys_ux_content_picker')
			return this.rootVsParentFieldsForContentPicker(abort, warn);
		
		if (this.elem.sys_class_name == 'sys_ux_custom_content_root_elem')
			return this.rootVsParentFieldsForContentExt(abort, warn);

    // parent and is_root are mutually exclusive
    this.elem.is_root = Boolean(gs.nil(this.elem.parent));

    // tree_root can always be derived from parent
    this.elem.tree_root = this.treeRootDefaultValue();
	},
	
	rootVsParentFieldsForContentPicker: function (abort, warn) {
		// content picker is never a root
		this.elem.is_root = false;
		
		// content picker requires a parent
		if (gs.nil(this.elem.parent)) {
			warn('Content Picker requires a parent.  Must set parent field to save.');
			abort();
		}
		
		// fix root ref if necessary
		this.elem.tree_root = this.treeRootDefaultValue();
	},
	
	rootVsParentFieldsForContentExt: function (abort, warn) {
		// content extension is always a root
		this.elem.is_root = true;
		
		// content picker never has a parent, nor a root
		this.elem.parent = '';
		this.elem.tree_root = '';
	},
	
	placeholderRefQual: function () {
		return 'page=' + this.elem.getValue('page');
	},
	
	pickerDefaultValue: function () {
		if (gs.nil(this.elem.parent) && gs.nil(this.elem.placeholder))
			return '';
		if (this.elem.parent.sys_class_name == 'sys_ux_content_picker')
			return this.elem.parent + '';
		if (!gs.nil(this.elem.placeholder.picker))
			return this.elem.placeholder.picker + '';
		return '';
	},
	
	/**
	 * abort - function to call if we want to abort the action
	 * warn  - function to call (takes msg arg) if we want to surface the abort reason
	 */
	pickerVsParentFields: function (abort, warn) {
		abort = abort || function(){};
		warn = warn || function(){};
		
		if (this.elem.sys_class_name == 'sys_ux_content_picker') {
			this.elem.picker = '';
			return;
		}
		
		this.elem.picker = this.pickerDefaultValue();
	},

    type: 'UxPageElementInvariants'
};
```