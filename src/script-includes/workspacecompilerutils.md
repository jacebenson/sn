---
title: "WorkspaceCompilerUtils"
id: "workspacecompilerutils"
---

API Name: global.WorkspaceCompilerUtils

```js
var WorkspaceCompilerUtils = Class.create();

WorkspaceCompilerUtils.prototype = {
    initialize: function() {},

    type: 'WorkspaceCompilerUtils',

	runValidations: function(workspace) {
		var uxPageUrl = this.makeWorkspaceUxPageUrl(workspace.getValue('workspace_url'));
		if (this.isInUsePageUrl(uxPageUrl)) {
			return {
				passes: false,
				shouldAbort: true,
				message: 'Could not save this Workspace with URL path already in use: ' + uxPageUrl
			};
		}
		return {passes: true, shouldAbort: false};
	},
	
	isValidUxPageRegistry: function (pageRegistryId) {
		if (gs.nil(pageRegistryId))
			return false;
		var pageReg = new GlideRecord('sys_ux_page_registry');
		return pageReg.get(pageRegistryId);
	},
	
	isValidContentExtension: function (contExtId) {
		if (gs.nil(contExtId))
			return false;
		var contExt = new GlideRecord('sys_ux_custom_content_root_elem');
		return contExt.get(contExtId);
	},

	makeWorkspaceUxPageUrl: function(thisWorkspaceSubpath) {
		return "workspace/" + thisWorkspaceSubpath;
	},

	isInUsePageUrl: function(url) {
		var pageRegistry = new GlideRecord('sys_ux_page_registry');
		pageRegistry.addQuery('path', url);
		pageRegistry.query();
		return pageRegistry.hasNext();
	},
	
	getCanonicalUxPage: function() {
		// sys_id of the Agent Workspace record in sys_ux_page
		var canonical = gs.getProperty(
			'com.workspace.canonical_ux_page',
			'b70867ad0f603300bb57f4a1ff767e15'
		);
		var uxPage = new GlideRecord('sys_ux_page');

		if(uxPage.get(canonical)) {
			return uxPage.getUniqueValue();
		}

		return '';
	},
	
	compileContentExtension: function(libComponent, current, placeholder, label) {
		if (libComponent == '') {
			return '';
		}
		
		var name = !!label ? label : current.getValue('label') + ' Module';
		var contentExtension = this.createContentExtension(name, placeholder, libComponent, current);

		return contentExtension.getUniqueValue();
	},

	compileSecondaryContentExtension: function(current) {
		// sys_id of the Workspace Module Secondary Content record in sys_ux_content_placeholder_elem
		var placeholder = gs.getProperty(
			'com.workspace.secondary_content_placeholder',
			'12376f475300330030c3ddeeff7b12bc'
		);

		return this.compileContentExtension(current.detail_component, current, placeholder, current.getValue('label') + ' Module Detail');
	},

	compilePrimaryContentExtension: function(current) {
		// sys_id of the Workspace Module Primary Content record in sys_ux_content_placeholder_elem
		var placeholder = gs.getProperty(
			'com.workspace.primary_content_placeholder',
			'123513475300330030c3ddeeff7b122f'
		);

		return this.compileContentExtension(current.content_component, current, placeholder,  current.getValue('label') + ' Module Content');
	},

	createButton: function(current) {
		var name = (current.getValue('label') || current.getValue('id')) + ' Button';
		// sys_id of the Workspace Toolbar Buttons record in sys_ux_content_placeholder_elem
		var placeholder = gs.getProperty(
			'com.workspace.toolbar_placeholder',
			'1232bfb5730c330075e8f358caf6a7ca'
		);
		// sys_id of the sn-workspace-toolbar-button record in sys_ux_lib_component
		var component = gs.getProperty(
			'com.workspace.toolbar_component_button',
			'c599f5f3b6554fd79cd983bf4ea75968'
		);
		var contentExtension = this.createContentExtension(name, placeholder, component, current);
		
		this.updateButton(contentExtension, current);
		
		return contentExtension.getUniqueValue();
	},
	
	createContentExtension: function(name, placeholder, libComponent, currentModule) {
		var canonicalPage = this.getCanonicalUxPage();
		var customContentRootElem = new GlideRecord('sys_ux_custom_content_root_elem');
		var applicablePage = currentModule.workspace_config.compiled_page_registry;
		
		customContentRootElem.newRecord();
		customContentRootElem.setValue('component', libComponent);
		customContentRootElem.setValue('name', name);
		customContentRootElem.setValue('page', canonicalPage);
		customContentRootElem.setValue('applicability', 'single');
		customContentRootElem.setValue('applicable_page', applicablePage);
		customContentRootElem.setValue('placeholder', placeholder);
		customContentRootElem.setValue('active', currentModule.active);
		customContentRootElem.setValue('order', currentModule.order);
		customContentRootElem.insert();

		customContentRootElem.picker_condition['module_id'] = currentModule.id;
		customContentRootElem.update();
		
		this.setRolesForElement(customContentRootElem.getUniqueValue(), this.getArrayFromGlideList(currentModule, 'roles'));

		return customContentRootElem;
	},
	
	getArrayFromGlideList: function (record, field) {
		if (!record.isValidField(field))
			return [];
		if (gs.nil(record[field]))
			return [];
		return record.getValue(field).split(',');
	},
	
	setRolesForElement: function (elementId, roleIds) {
		// We try to re-use as many existing permission records as possible
		// to minimize sys_update_xml generation
		var elemPermission = new GlideRecord('sys_ux_page_element_m2m_role');
		var rolesToAdd = roleIds.slice(0).sort().filter(function (item, pos, ary) {
			return !pos || item != ary[pos - 1];
		}); // make sorted, deduped copy
		var permsToDelete = [], roleId, i;
		elemPermission.addQuery('element', elementId);
		elemPermission.orderBy('role.sys_id');
		elemPermission.query();
		
		// First, determine if we already have existing that can be kept as-is,
		// As well, collect any sys_id for records we can over-write, or potentially delete
		while (elemPermission.next()) {
			roleId = elemPermission.getValue('role');
			if (rolesToAdd.length == 0 || rolesToAdd[0] != roleId) {
				// Mark for re-use or (potential) deletion, if not in toAdd list
				permsToDelete.push(elemPermission.getUniqueValue());
			} else {
				// Remove from toAdd list if exists
				rolesToAdd.shift();
				// Clear group setting, if set (we only compile to role based permissions)
				if (!gs.nil(elemPermission.group)) {
					elemPermission.group = '';
					elemPermission.update();
				}
			}
		}
		
		// Second, over-write old perm records with any completely new rolesToAdd
		elemPermission = new GlideRecord('sys_ux_page_element_m2m_role');
		elemPermission.addQuery('sys_id', 'IN', permsToDelete);
		elemPermission.query();
		permsToDelete = [];
		while (elemPermission.next()) {
			if (rolesToAdd.length > 0) {
				elemPermission.role = rolesToAdd.shift();
				elemPermission.group = '';
				elemPermission.update();
			} else {
				permsToDelete.push(elemPermission.getUniqueValue());
			}
		}
		
		// Third, delete any superfluous permissions
		if (permsToDelete.length > 0) {
			elemPermission = new GlideRecord('sys_ux_page_element_m2m_role');
			elemPermission.addQuery('sys_id', 'IN', permsToDelete);
			elemPermission.query();
			elemPermission.deleteMultiple();
		}
		
		// Last, if any rolesToAdd left, add them!
		for (i = 0; i < rolesToAdd.length; i++) {
			elemPermission = new GlideRecord('sys_ux_page_element_m2m_role');
			elemPermission.newRecord();
			elemPermission.element = elementId;
			elemPermission.role = rolesToAdd[i];
			elemPermission.insert();
		}
	},
	
	deactivateContentExtension: function(sys_id) {
		if (gs.nil(sys_id)) {
			return;
		}
		var customContentRootElem = GlideRecord('sys_ux_custom_content_root_elem');

		if (customContentRootElem.get(sys_id)) {
			customContentRootElem.setValue('active', false);
			customContentRootElem.update();
		}
	},
	
	deactivateAllContentExtensions: function(module) {
		module.content_component = '';
		module.detail_component = '';
		
		this.deactivateContentExtension(module.content);
		this.deactivateContentExtension(module.detail);
	},
	
	deleteContentExtension: function(sys_id) {
		var customContentRootElem = GlideRecord('sys_ux_custom_content_root_elem');

		while (customContentRootElem.get(sys_id)) {
			customContentRootElem.deleteRecord();
		}
	},
	
	deleteAllContentExtensions: function(module) {
		this.deleteContentExtension(module.content);
		this.deleteContentExtension(module.detail);
		
		module.content_component = '';
		module.detail_component = '';
		module.content = '';
		module.detail = '';
		
		// We currently can only safely delete attrs when both content extensions are removed because
		// we have no reference to which content extension created which attr
		var variableValue = GlideRecord('sys_variable_value');
		variableValue.addQuery('document_key', module.getUniqueValue());
		variableValue.query();
		while (variableValue.next()) {
			variableValue.deleteRecord();
		}
	},
		
	updateButton: function(button, current) {
		button.setValue('active', current.getValue('active'));
		button.setValue('order', current.getValue('order'));
		button.attrs['module-id'] = current.getValue('id');
		button.attrs['icon'] = current.getValue('icon');
		button.attrs['label'] = current.getValue('label');
		button.update();
		this.setRolesForElement(button.getUniqueValue(), this.getArrayFromGlideList(current, 'roles'));
	}
};
```