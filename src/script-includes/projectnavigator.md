---
title: "ProjectNavigator"
id: "projectnavigator"
---

API Name: sn_devstudio.ProjectNavigator

```js
var ProjectNavigator = (function() {

	function attachFiles(navigationTree, fileTypeRegistry) {
		return _.map(navigationTree, function(group) {
			group.types = _.map(group.types, function(type) {
				var files = fileTypeRegistry.filesForKey(type.navigationKey);
				
				if (files) {
					return _.extend(type, {
						artifacts: files
					});
				}
				return type;
			});
			return group;
		});
	}

	return {
		getProjectTree: function(appId) {
			if(!appId || appId.toLowerCase() === 'global' || appId.toLowerCase() === 'null')
				return [];
			
			var appExplorerStructure = AppExplorerStructure.create();
			var categoryTree = appExplorerStructure.categoryTree();
			
			var defaultHandler = FileTypeDefaultHandler(appId, appExplorerStructure);
			var fileTypeRegistry = AppFileTypeRegistry.create(defaultHandler);
			fileTypeRegistry.registerHandler("sys_ui_form", FileTypeFormHandler(appId));
			fileTypeRegistry.registerHandler('sys_db_object', FileTypeTableHandler(appId));
			fileTypeRegistry.registerHandler('sys_ui_list', FileTypeListLayoutHandler(appId));
			fileTypeRegistry.registerHandler('sys_ui_related_list', FileTypeRelatedListLayoutHandler(appId));
			fileTypeRegistry.registerHandler('wf_workflow', FileTypeWorkflowHandler(appId));
			fileTypeRegistry.registerHandler('sys_dictionary', FileTypeExternalFieldHandler(appId));
			fileTypeRegistry.registerHandler('sys_security_acl', FileTypeACLHandler(appId));
			fileTypeRegistry.registerHandler('sys_ui_list_control', FileTypeListControlHandler(appId));
			fileTypeRegistry.registerHandler('sys_ws_operation', FileTypeRestOperationHandler(appId));
			fileTypeRegistry.registerHandler('v_ws_editor', FileTypeImportSetWebServiceHandler(appId));
			fileTypeRegistry.registerHandler('sp_page', FileTypeSpPageHandler(appId));
			fileTypeRegistry.registerHandler('sp_portal', FileTypeSpPortalHandler(appId));
			fileTypeRegistry.registerHandler('wf_element_activity', FileTypeOrchestrationActivityHandler(appId));
			fileTypeRegistry.registerHandler('sys_sg_screen', FileTypeSGScreenHandler(appId));
			fileTypeRegistry.registerHandler('sys_extension_instance', FileTypeExtensionInstanceHandler(appId));
			fileTypeRegistry.registerHandler('sys_ui_extension_instance', FileTypeExtensionInstanceHandler(appId));
			fileTypeRegistry.registerHandler('sys_client_extension_instance', FileTypeExtensionInstanceHandler(appId));
			
			return attachFiles(categoryTree, fileTypeRegistry);
		}
	};
})();
```