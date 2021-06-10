---
title: "WindowsInstalledSoftwareLegacy"
id: "windowsinstalledsoftwarelegacy"
---

API Name: global.WindowsInstalledSoftwareLegacy

```js
var WindowsInstalledSoftwareLegacy = Class.create();

WindowsInstalledSoftwareLegacy.prototype = {
	/**
     * Runs the probe instance
     */    
    process : function(output, related_data) {  
		related_data.packages = [];
		
		var registry = output.Registry;
        if (JSUtil.nil(registry))
            return;
        
        var softwareList = this.getSoftware(registry);

        for (var sw in softwareList)
            related_data.packages.push(softwareList[sw]);
		
		var osPackage = {};
		related_data.osPackage = this._setOSIDs(osPackage, registry);
		related_data.caption = output.Win32_OperatingSystem.Caption;
		related_data.osVersion = output.Win32_OperatingSystem.Version;
		
		var iePkgObj = this.getIEPackage(registry);
		if (JSUtil.notNil(iePkgObj))
            related_data.packages.push(iePkgObj);
	},
	
	getSoftware: function(registry) {
        var softwareList = {};
        var productIds = this.getProductIds(registry, softwareList); //get product ID as well as software entries.
        var officeLic = this.getOfficeLicenses(registry);

        var softwareReg = [];
        softwareReg.push("HKEY_LOCAL_MACHINE.Software.Microsoft.Windows.CurrentVersion.Uninstall");
        softwareReg.push("HKEY_LOCAL_MACHINE.Software.Wow6432Node.Microsoft.Windows.CurrentVersion.Uninstall");

        for (var i = 0; i < softwareReg.length; i++) {
            var node = this.findRegistryNode(registry, softwareReg[i]);
            if (!node)
                continue;

            this.parseSoftware(node, softwareList, productIds, officeLic);
        }

        return softwareList;
    },

    parseSoftware: function(node, softwareList, productIds, officeLic) {
        var nodeArray = g_array_util.ensureArray(node.entry);
        for (var dataKey = 0; dataKey < nodeArray.length; dataKey++) {
            var displayName = this.findNodeValueWithAttribute(nodeArray[dataKey], "DisplayName");
            var parentDisplayName = this.findNodeValueWithAttribute(nodeArray[dataKey], "ParentDisplayName");
            var displayVersion = this.findNodeValueWithAttribute(nodeArray[dataKey], "DisplayVersion");
            var publisher = this.findNodeValueWithAttribute(nodeArray[dataKey], "Publisher");
            var uninstallString = this.findNodeValueWithAttribute(nodeArray[dataKey], "UninstallString");
            var installDate = this.findNodeValueWithAttribute(nodeArray[dataKey], "InstallDate");
            var msiID = this.parseMsiId(uninstallString);

            if (!displayName)
                continue;

            var uniqueName = this.getUniqueName(displayName, displayVersion);
			
            // Sometimes we encounter two entries of that have the same name, but one has the msi_id and the
            // other one doesn't. In which case we want to give it another chance matching the office license.
            if (softwareList[uniqueName]) {
                if (JSUtil.nil(msiID) || JSUtil.notNil(softwareList[uniqueName].msi_id)) {
					//populate detailed information 
					softwareList[uniqueName].part_of = parentDisplayName;
					softwareList[uniqueName].install_date = installDate;
                    continue;
				}
            }

            if (displayName == "detectedInvalidXMLCharacter") {
                this.log("Detected an invalid character in registry for " + displayName , 
                        'Windows - Installed Software Sensor', this.getEccQueueId(), null);
                continue;
            }
			
            softwareList[uniqueName] = {};
            softwareList[uniqueName].name = displayName;
            softwareList[uniqueName].version = displayVersion;
            softwareList[uniqueName].vendor = publisher;
            softwareList[uniqueName].part_of = parentDisplayName;
            softwareList[uniqueName].uninstall_string = uninstallString;
            softwareList[uniqueName].install_date = installDate;
			
			if (/Acrobat/.test(displayName) && !JSUtil.nil(uninstallString) && (uninstallString.indexOf("{") >= 0)&&(uninstallString.indexOf("}") >= 0)) {
				var editionString = uninstallString.split("{")[1];
					editionString = editionString.split("}")[0];
					if (!JSUtil.nil(editionString)) {
						var splitEdition = editionString.split("-");
						if (splitEdition.length >= 4)
							softwareList[uniqueName].edition = splitEdition[3];
					}
			}

            // If product id is non-existent, don't bother since the following info is for creating licenses.
            // And without a product id, we just wouldn't do it.
            if (JSUtil.nil(productIds[uniqueName]))
                continue;

            softwareList[uniqueName].product_id = productIds[uniqueName];

            if (JSUtil.nil(msiID) || JSUtil.nil(officeLic[msiID]))
                continue;

            softwareList[uniqueName].msi_id = msiID;
            softwareList[uniqueName].digital_product_id = officeLic[msiID].digitalproductid;
        }

        return softwareList;
    },

    parseMsiId: function(str) {
        var msiID = "";

        if (str && str.toLowerCase().indexOf("msiexec") > -1) {
            var start = str.indexOf("{");
            var finalString = str.substring(start+1);
            var end = finalString.indexOf("}");
            msiID = finalString.substring(0, end);
        }

        return msiID;
    },
	
	getIEPackage: function(registry) {
		var regKey = "HKEY_LOCAL_MACHINE.Software.Microsoft.Internet Explorer";
        var node = this.findRegistryNode(registry, regKey);
        var svcVersion = this.findNodeValueWithAttribute(node, "svcVersion");
		var version = this.findNodeValueWithAttribute(node, "Version");
		
		// Check if we can detect IE
		if (JSUtil.nil(svcVersion) && JSUtil.nil(version))
		    return;	
		
		var iePackage = {};
        iePackage.name = "Internet Explorer";
        iePackage.vendor = "Microsoft";
		
		// Version should work for IE 4.0+. svcVersion is new to IE 10. 
	    iePackage.version = svcVersion ? svcVersion : version;
		
		regKey = "HKEY_LOCAL_MACHINE.Software.Microsoft.Internet Explorer.Registration";
        node = this.findRegistryNode(registry, regKey);
		var productId = this.findNodeValueWithAttribute(node, "ProductId");
		
		if (!JSUtil.nil(productId)) 
			iePackage.product_id = productId;
			
        return iePackage;
    },

    _setOSIDs: function(osPackage, registry) {
        var node = this.findRegistryNode(registry, 
                "HKEY_LOCAL_MACHINE.Software.Microsoft.Windows.CurrentVersion");
        var node2 = this.findRegistryNode(registry, 
                "HKEY_LOCAL_MACHINE.Software.Microsoft.Windows NT.CurrentVersion");

        if (!node || !node2)
            return osPackage;

        var prodId = this.findNodeValueWithAttribute(node, "ProductId");

        if (JSUtil.nil(prodId) || prodId == "") //Try it again at a diff location (like for Vista)...                
            prodId = this.findNodeValueWithAttribute(node2, "ProductId");

        var dProdId = this.findNodeValueWithAttribute(node2, "DigitalProductID");

        osPackage.product_id = prodId;
        osPackage.digital_product_id = dProdId;

        return osPackage;
    },

    getProductIds: function(registry, softwareList) {
        var prodIdReg = [];
        prodIdReg.push("HKEY_LOCAL_MACHINE.Software.Microsoft.Windows.CurrentVersion.Installer.UserData");
        prodIdReg.push("HKEY_LOCAL_MACHINE.Software.Wow6432Node.Microsoft.Windows.CurrentVersion.Installer.UserData");

        var productIds = {};
        for (var i = 0; i < prodIdReg.length; i++) {
            var node = this.findRegistryNode(registry, prodIdReg[i]);
            if (!node)
               continue;

            productIds = this.parseProductIds(node, productIds, softwareList);
        }

        return productIds;
    },

    parseProductIds: function(node, productIds, softwareList) {
        var nodeArray = g_array_util.ensureArray(node.entry);
        for (var dataKey=0; dataKey < nodeArray.length; dataKey++) {
            var products = this.findNodeWithAttribute(nodeArray[dataKey], "Products");
            if (!products)
                continue;

            var nodeArray2 = g_array_util.ensureArray(products.entry);
            for (var dataKey2 = 0; dataKey2 < nodeArray2.length; dataKey2++) {
                var installProperties = this.findNodeWithAttribute(nodeArray2[dataKey2], "InstallProperties");
                var publisher = this.findNodeValueWithAttribute(installProperties, "Publisher");
                var pid = this.findNodeValueWithAttribute(installProperties, "ProductID");
                var name = this.findNodeValueWithAttribute(installProperties, "DisplayName");
                var version = this.findNodeValueWithAttribute(installProperties, "DisplayVersion");

                if (!name)
                    continue;

                var validPID = true;
                if (pid == null || pid.length == 0 || pid.toLowerCase() == "none")
                    validPID = false;

                // As it turned out, sometimes customers don't have their software in the uninstall resgtries (due to 
                // improper imaging or deliberate efforts), but we should still fish it out this Products registries 
                // first.
                var uniqueName = this.getUniqueName(name, version);
                if (!softwareList[uniqueName]) {
                    softwareList[uniqueName] = {};
                    softwareList[uniqueName].name    = name;
                    softwareList[uniqueName].version = version ;
                    softwareList[uniqueName].vendor  = publisher;
                    if (validPID)
                        softwareList[uniqueName].product_id  = pid;
                }

                if (validPID)
                    productIds[uniqueName] = pid;
            }
        }

        return productIds;
    },

    getOfficeLicenses: function(registry) {
        officeLicenseReg = [];
        officeLicenseReg.push("HKEY_LOCAL_MACHINE.Software.Microsoft.Office");
        officeLicenseReg.push("HKEY_LOCAL_MACHINE.Software.Wow6432Node.Microsoft.Office");

        var officeLicenses = {};
        for (var i = 0; i < officeLicenseReg.length; i++) {
            var node = this.findRegistryNode(registry, officeLicenseReg[i]);
            if (!node)
                continue;

            officeLicenses = this.parseOfficeLicense(node, officeLicenses);
        }

        return officeLicenses;
    },

    parseOfficeLicense: function(node, officeLicenses) {
        var nodeArray = g_array_util.ensureArray(node.entry);
        for (var dataKey = 0; dataKey < nodeArray.length; dataKey++) {
            var registrations = this.findNodeWithAttribute(nodeArray[dataKey], "Registration");

            if (!registrations)
                continue;

            var nodeArray2 = g_array_util.ensureArray(registrations.entry);
            for (var dataKey2 = 0; dataKey2 < nodeArray2.length; dataKey2++) {
                var productID = this.findNodeValueWithAttribute(nodeArray2[dataKey2], "ProductID");
                var digitalProductID = this.findNodeValueWithAttribute(nodeArray2[dataKey2], "DigitalProductID");


                var uuid = new String(nodeArray2[dataKey2]['@key']);

                if (uuid.substring(0, 1) == "{")
                    uuid = uuid.substring(1, uuid.length-1);

                officeLicenses[uuid] = {};
                officeLicenses[uuid].productid = productID;
                officeLicenses[uuid].digitalproductid = digitalProductID;
            }
        }

        return officeLicenses;
    },

    getUniqueName: function(name, version) {
        return name + " " + version;
    },
	
	/********************************************** 
     * Manage the Windows installed software xml
     *
     * Example payload:
     *   <results probe_time="6313">
     *     <result>
     *       <Registry>
     *         <entry key="HKEY_LOCAL_MACHINE">
     *           <entry key="Software">
     *             <entry key="Microsoft">
     *               <entry key="Windows">
     *                 <entry key="Name">
     *                   <value>Just a name</value>
     *                 </entry>
     *               </entry>
     *             </entry>
     *           </entry>
     *         </entry>
     *       </Registry>
     *     </entry>
     *   </results>
     * 
     *   // To find the value of the key called "name", here's how these methods can be used.
     *   // registry is a variable representing the payload
     *   var node = findRegistryNode(registry, "HKEY_LOCAL_MACHINE.Software.Microsoft");
     *   var name = findNodeValueWithAttribute(node, "Name");
     *********************************************/
    findRegistryNode: function(currNode, regName){
        var node = currNode;
        var names = regName.split(".");

        for (var i=0; i<names.length; i++) {
            node = this.findNodeWithAttribute(node, names[i]);
            if (!node)
                return null;
        }

        return node;
    },

    findNodeWithAttribute: function(currNode, attrName) {
        if (JSUtil.nil(currNode))
            return "";

        var nodeArray = g_array_util.ensureArray(currNode.entry);
        for (var i=0; i<nodeArray.length; i++)
            if (nodeArray[i]['@key'] == attrName)
                return nodeArray[i];

        return null;
    },

    findNodeValueWithAttribute: function(currNode, attrName) {
        if (JSUtil.nil(currNode))
            return "";

        var nodeArray = g_array_util.ensureArray(currNode.entry);
 
        for (var i=0; i<nodeArray.length; i++) {  
			
            if (nodeArray[i]['@key'] == attrName) {         
                // WMI - expected output a non-null json object { '@type': "xxx", '#text': "returned value" }
                if (JSUtil.notNil(nodeArray[i].value) && JSUtil.notNil(nodeArray[i].value['#text']))             
                    //return the #text field, ignoring the @type field value
                    return nodeArray[i].value['#text']; 
                else                
                    // Powershell - expected output
                    return nodeArray[i].value;		  
		    } // end if 

        } // end for

        return "";
    },
	
	type: "WindowsInstalledSoftwareLegacy"
};
```