---
title: "CalculateComplianceScore"
id: "calculatecompliancescore"
---

API Name: global.CalculateComplianceScore

```js
var CalculateComplianceScore = Class.create();
CalculateComplianceScore.prototype = {
    logResults: function(harc_obj, compliance_state, current_val, record_link) {
        harc_obj.harc_curr_val = current_val;
        harc_obj.harc_compliance_state = compliance_state;
        harc_obj.harc_links = record_link;
        harc_obj.update();
    },
    initAllFunctions: function() {
        var harc_obj = new GlideRecord('appsec_hardening_configurations');
        harc_obj.query();
        while (harc_obj.next()) {
            if (harc_obj.harc_links.toString().includes('sys_properties')) {
                var sys_prop_obj = new GlideRecord('sys_properties');
                sys_prop_obj.get('name', harc_obj.harc_config_name.toString());
                this.checkSysProperties(sys_prop_obj.name.toString());
            } else if (harc_obj.harc_links.includes('v_plugin')) {
                var plugin_obj = new GlideRecord('v_plugin');
                plugin_obj.get('id', harc_obj.harc_config_name.toString());
                if (plugin_obj && plugin_obj.sys_id) {
                    this.checkPlugins(plugin_obj, harc_obj);
                } else {
                    var result = '';
                    var current = '';
                    if (GlidePluginManager.isRegistered(harc_obj.harc_config_name.toString())) {
                        result = 'Pass';
                        current = 'active';
                    } else {
                        result = 'Fail';
                        current = 'not active';
                    }
                    this.logResults(harc_obj, result, current, harc_obj.harc_links.toString(), harc_obj.sys_id.toString(), harc_obj.getTableName());
                }
            } else if (harc_obj.harc_links.toString().includes('ip_access')) {
                this.checkIPAccess(harc_obj);
            } else if (harc_obj.harc_links.toString().includes('sys_user')) {
                this.checkSysUser(harc_obj);
            } else if (harc_obj.harc_links.toString().includes('sys_home')) {
                this.checkSysHome(harc_obj);
            } else if (harc_obj.harc_links.toString().includes('security_top_recommendations')) {
                this.checkSysInstallation(harc_obj);
            } else if (harc_obj.harc_config_name.toString().includes('sys_whitelist_package')) {
                this.checkWhitelistPackage(harc_obj);
            } else if (harc_obj.harc_config_name.toString().includes('sys_whitelist_member')) {
                this.checkWhitelistMember(harc_obj);
            } else if (harc_obj.harc_links.toString().includes('sysevent_script_action')) {
                this.checkSysEventScriptAction(harc_obj);
            }
        }
    },
    checkGlideProperty: function(harc_obj, config_obj) {
        var result = '';
        if (config_obj.value.toLowerCase().toString() == harc_obj.harc_reco_value.toLowerCase().toString()) {
            result = 'Pass';
        } else {
            result = 'Fail';
        }
        this.logResults(harc_obj, result, config_obj.value.toString(), config_obj.getLink(true));
    },
    checkPlugin: function(config_obj, harc_obj) {
        var result = '';
        var latest = '';
        if (config_obj.active.toString() == 'active') {
            if (GlidePluginManager.isRegistered(config_obj.id.toString())) {
                result = 'Pass';
                latest = 'active';
            } else {
                result = 'Fail';
                latest = 'not active';
            }
        } else {
            if (!GlidePluginManager.isRegistered(config_obj.id.toString())) {
                result = 'Pass';
                latest = 'active';
            } else {
                result = 'Fail';
                latest = 'not active';
            }
        }
        this.logResults(harc_obj, result, latest, config_obj.getLink(true));
    },
    checkPluginDep: function(pluginID) {
        if (GlidePluginManager.isRegistered(pluginID)) {
            result = 'Pass';
        } else {
            result = 'Fail';
        }
        return result;
    },
    checkSysProperties: function(sys_prop_name) {
        var harc_obj = new GlideRecord('appsec_hardening_configurations');
        harc_obj.get('harc_config_name', sys_prop_name);
        var config_obj = new GlideRecord('sys_properties');
        config_obj.get(sys_prop_name);
        var output = '';
        var result = '';
        var record_link = '';
        switch (sys_prop_name) {
            case "glide.ui.attachment.download_mime_types":
                // 6.1 Download MIME Types
                record_link = config_obj.getLink(true);
                var fdmt = gs.getProperty('glide.ui.attachment.force_download_all_mime_types'); //previously 6.4
                if (fdmt != null && fdmt.toLowerCase().toString() == 'true') {
                    result = 'Pass';
                    output = 'Pre-conditions not met : Skipped Check';
                } else {
                    var mime_types = config_obj.value.toString();
                    if (mime_types && !gs.nil(mime_types)) {
                        result = 'Pass';
                        output = mime_types;
                    } else {
                        result = 'Fail';
                        output = 'Not defined';
                    }
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.ui.jelly.js_interpolation.protect":
                // 2.11 Jelly/JS Interpolation
                var version = gs.getProperty('glide.war.assigned');
                version = version || '';
                var re = /glide-(\w+)/;
                var m = version.match(re);
                var isCheckRequried = true;
                if (m != null) {
                    isCheckRequried = (m[1] >= "jakarta");
                }
                if (isCheckRequried) {
                    this.checkGlideProperty(harc_obj, config_obj);
                } else {
                    result = 'Pass';
                    output = 'Pre-conditions not met : Skipped Check';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, output, record_link);
                }
                break;
            case "glide.enable.password_policy":
                record_link = 'isc?id=security_top_recommendations';
                output = config_obj.value.toString();
                if (output && output == 'true') {
                    result = 'Pass';
                    output = 'active';
                } else {
                    result = 'Fail';
                    output = 'Not active';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.ui.strict_customer_uploaded_content_types":
                // 6.3 Specify Downloadable File Types
                record_link = config_obj.getLink(true);
                output = config_obj.value.toString();
                if (output && !gs.nil(output)) {
                    result = 'Pass';
                } else if (gs.nil(output)) {
                    result = 'Pass';
                    output = "Default: ico,gif,png,jpg,jpeg,bmp,ogg,mp3";
                } else {
                    result = 'Fail';
                    output = 'Not defined';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.attachment.extensions":
                //6.4 Restrict File extensions for Attachment
                record_link = config_obj.getLink(true);
                output = config_obj.value.toString();
                if (output && !gs.nil(output)) {
                    result = 'Pass';
                } else {
                    output = 'Not Defined';
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.ui.session_timeout":
                //7.3 Session Timeout
                record_link = config_obj.getLink(true);
                output = config_obj.value.toString();
                if (output && output > 0) {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "com.glide.communications.trustmanager_trust_all":
                // 9.1 Certificate Trust
                record_link = config_obj.getLink(true);
                output = config_obj.value.toString();
                if (output && output.toLowerCase().toString() == 'false') {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.attachment.blacklisted.extensions":
                // 6.9 Specify Blacklisted Extensions
                var parent_current = gs.getProperty('glide.security.attachment_type.use_blacklist'); //Enable Blacklist for Attachments must be active
                if (parent_current != null && parent_current.toLowerCase().toString() == 'true') {
                    record_link = config_obj.getLink(true);
                    output = config_obj.value.toString();
                    if (!gs.nil(output)) {
                        result = 'Pass';
                    } else {
                        output = 'Not Defined';
                        result = 'Fail';
                    }
                    this.logResults(harc_obj, result, output, record_link);
                } else {
                    output = 'Pre-conditions not met : Skipped check';
                    result = 'Fail';
                    this.logResults(harc_obj, result, output, record_link);
                }
                break;
            case "glide.attachment.blacklisted.types":
                // 6.10 Specify Blacklisted File Types
                var parent_types = gs.getProperty('glide.security.attachment_type.use_blacklist'); //Enable Blacklist for Attachments must be active
                if (parent_types != null && parent_types.toLowerCase().toString() == 'true') {
                    record_link = config_obj.getLink(true);
                    output = config_obj.value.toString();
                    if (!gs.nil(output)) {
                        result = 'Pass';
                    } else {
                        output = 'Not Defined';
                        result = 'Fail';
                    }
                    this.logResults(harc_obj, result, output, record_link);
                } else {
                    output = 'Pre-conditions not met : Skipped check';
                    result = 'Fail';
                    this.logResults(harc_obj, result, output, record_link);
                }
                break;
            case "glide.security.url.whitelist":
                //10.3 URL white list
                var h = new GlideRecordSecure('sys_properties');
                h.addEncodedQuery('name=glide.security.url.whitelist^valueISNOTEMPTY');
                h.query();
                if (h.next()) {
                    result = 'Pass';
                    output = 'active';
                    record_link = config_obj.getLink(true);
                } else {
                    result = 'Fail';
                    output = 'Not active';
                    record_link = config_obj.getTableName();
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.xml.entity.whitelist":
                //10.5 XML External Entity Processing - Whitelist
                h = new GlideRecordSecure('sys_properties');
                h.addEncodedQuery('name=glide.xml.entity.whitelist^valueISNOTEMPTY');
                h.query();
                if (h.next()) {
                    result = 'Pass';
                    output = 'active';
                    record_link = config_obj.getLink(true);
                } else {
                    result = 'Fail';
                    output = 'Not active';
                    record_link = config_obj.getTableName();
                }
                this.logResults(harc_obj, result, output, record_link);
                this.checkSysProperties("glide.xml.entity.whitelist.enabled");
                this.checkSysProperties("glide.stax.whitelist_enabled");
                this.checkSysProperties("glide.stax.allow_entity_resolution");
                break;
            case "glide.user.trusted_domain":
                //11.1 Restrict By Domain
                var current = gs.getProperty('glide.email.read.active'); //incoming email must be active
                if (current != null && current.toLowerCase().toString() == 'true') {
                    current = gs.getProperty('glide.pop3readerjob.create_caller'); //creating user from email must be active
                    if (current != null && current.toLowerCase().toString() == 'true') {
                        output = config_obj.value.toString(); // if above conditions are met, then check for trusted domain
                        if (output && !gs.nil(output)) {
                            if (output == '*') {
                                result = 'Fail';
                                record_link = config_obj.getLink(true);
                            } else {
                                result = 'Pass';
                                record_link = config_obj.getLink(true);
                            }
                            this.logResults(harc_obj, result, output, record_link);
                        } else {
                            result = 'Fail'; // if no values specified
                            record_link = config_obj.getLink(true);
                            this.logResults(harc_obj, result, output, record_link);
                        }
                    } else {
                        result = 'Pass'; // if no values specified
                        output = 'Pre-conditions not met : Skipped check';
                        record_link = config_obj.getLink(true);
                        this.logResults(harc_obj, result, output, record_link);
                    }
                } else {
                    result = 'Pass'; // if no values specified
                    output = 'Pre-conditions not met : Skipped check';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, output, record_link);
                }
                break;
            case "glide.user.default_password":
                //11.2 Set Complex 'Default' Password
                current = gs.getProperty('glide.email.read.active'); //incoming email must be active
                if (current != null && current.toLowerCase().toString() == 'true') {
                    current = gs.getProperty('glide.pop3readerjob.create_caller'); //creating user from email must be active
                    if (current != null && current.toLowerCase().toString() == 'true') {
                        output = GlideCryptoService.getInstance().decrypt(config_obj.value.toString()); //get the value of the property
                        if (output && !gs.nil(config_obj.value.toString())) {
                            if (output == 'Password' || output == 'password' || output == 'MyComp@ny123!') { // if value is password , result is fail
                                result = 'Fail';
                                record_link = config_obj.getLink(true);
                            } else {
                                result = 'Pass';
                                record_link = config_obj.getLink(true);
                            }
                            output = config_obj.value.toString();
                            this.logResults(harc_obj, result, output, record_link);
                        } else {
                            result = 'Fail';
                            record_link = config_obj.getLink(true);
                            this.logResults(harc_obj, result, current, record_link);
                        }
                    } else {
                        result = 'Pass';
                        output = 'Pre-conditions not met : Skipped check';
                        record_link = config_obj.getLink(true);
                        this.logResults(harc_obj, result, current, record_link);
                    }
                } else {
                    result = 'Pass';
                    output = 'Pre-conditions not met : Skipped check';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, current, record_link);
                }
                break;
            case "glide.email.inbound.convert_html_inline_attachment_references":
                //11.3 Convert Inbound Email HTML
                current = gs.getProperty('glide.email.read.active'); //incoming email must be active
                if (current != null && current.toLowerCase().toString() == 'true') {
                    this.checkGlideProperty(harc_obj, config_obj);
                } else {
                    result = 'Pass';
                    output = 'Pre-conditions not met : Skipped check';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, output, record_link);
                }
                break;
            case "glide.xml.entity.whitelist.enabled":
                //10.4.1.1 Allow Entity Validation with Whitelisting
                output = config_obj.value.toLowerCase().toString();
                var prereq = gs.getProperty('glide.xml.entity.whitelist'); //incoming email must be active
                if (prereq && !gs.nil(prereq)) {
                    if (output && output == 'true') {
                        this.checkGlideProperty(harc_obj, config_obj);
                    } else {
                        result = 'Fail';
                        record_link = "sys_properties.do";
                        this.logResults(harc_obj, result, output, record_link);
                    }
                } else {
                    result = 'Fail';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, output, record_link);
                }
                this.checkSysProperties("glide.stax.whitelist_enabled");
                break;
            case "glide.xmlutil.max_entity_expansion":
                //10.4.1.2 Setting Entity Expansion Threshold
                output = config_obj.value.toString();
                record_link = config_obj.getLink(true);
                if (output && output > 0 && output <= 500) {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.ui.user_cookie.life_span_in_days":
                //7.8 Session Window Timeout
                output = config_obj.value.toString();
                record_link = config_obj.getLink(true);
                if (output && output >= 1 && output <= 30) {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.ui.user_cookie.max_life_span_in_days":
                //7.7 Session Hard Timeout
                output = config_obj.value.toString();
                record_link = config_obj.getLink(true);
                if (output && output >= 1 && output <= 365) {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.stax.allow_entity_resolution":
                //10.4.2.1 Disable Entity Validation
                output = config_obj.value.toString();
                record_link = config_obj.getLink(true);
                if (output && output.toLowerCase().toString() == 'false') {
                    result = 'Pass';
                    record_link = config_obj.getLink(true);
                } else {
                    if (output) {
                        current = gs.getProperty('glide.xml.entity.whitelist');
                        if (current && !gs.nil(current)) {
                            current = gs.getProperty('glide.xml.entity.whitelist.enabled');
                            if (!gs.nil(current) && current.toLowerCase().toString() == 'true') {
                                current = gs.getProperty('glide.stax.whitelist_enabled');
                                if (current && current.toLowerCase().toString() == 'true') {
                                    result = 'Pass';
                                    record_link = config_obj.getLink(true);
                                } else {
                                    result = 'Fail';
                                    record_link = config_obj.getLink(true);
                                }
                            } else {
                                result = 'Fail';
                                record_link = config_obj.getLink(true);
                            }
                        } else {
                            result = 'Fail';
                            record_link = config_obj.getLink(true);
                        }
                    } else {
                        result = 'Fail';
                        record_link = "sys_properties.do";
                        output = "Property doesn't exist";
                    }
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            case "glide.stax.whitelist_enabled":
                //10.4.2.2 Allow Entity Validation with Whitelisting
                output = config_obj.value.toLowerCase().toString();
                record_link = config_obj.getLink(true);
                current = gs.getProperty('glide.xml.entity.whitelist');
                if (current && !gs.nil(current)) {
                    current = gs.getProperty('glide.xml.entity.whitelist.enabled');
                    if (current != null && current.toLowerCase().toString() == 'true') {
                        if (output && output == 'true') {
                            this.checkGlideProperty(harc_obj, config_obj);
                        } else {
                            result = 'Fail';
                            record_link = "sys_properties.do";
                            this.logResults(harc_obj, result, output, record_link);
                        }
                    } else {
                        result = 'Fail';
                        record_link = config_obj.getLink(true);
                        this.logResults(harc_obj, result, output, record_link);
                    }
                } else {
                    result = 'Fail';
                    record_link = config_obj.getLink(true);
                    this.logResults(harc_obj, result, output, record_link);
                }
                this.checkSysProperties("glide.stax.allow_entity_resolution");
                break;
            case "glide.http.cache_control":
                //Validate Cache-Control header value
                record_link = config_obj.getLink(true);
                output = config_obj.value.toLowerCase().toString();
                if (output && output == 'private') {
                    result = 'Pass';
                } else {
                    result = 'Fail';
                }
                this.logResults(harc_obj, result, output, record_link);
                break;
            default:
                // Handles the rest of the sys_properties
                // 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12
                // 3.2, 3.5, 3.6, 3.7, 3.9, 3.10, 3.12, 3.14, 3.15
                // 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13
                // 5.3, 5.4, 5.6, 5.7, 6.5, 6.6, 6.7, 6.8
                // 7.1, 7.2, 7.4, 7.5, 7.6, 9.2, 10.1, 10.2, 12.2, 19.1
                if (sys_prop_name) {
                    this.checkGlideProperty(harc_obj, config_obj);
                }
                break;
        }
    },
    checkPlugins: function(config_obj, harc_obj) {
        var output = '';
        var result = '';
        switch (config_obj.id.toString()) {
            case 'com.snc.integration.sso.saml20.update1':
                // 4.14 SAML 2.0 security enhancements
                var samlDepCheck = this.checkPluginDep('com.snc.integration.sso.saml20');
                if (samlDepCheck != null && samlDepCheck == 'Pass') {
                    this.checkPlugin(config_obj, harc_obj);
                } else {
                    result = 'Pass';
                    output = 'Dependent plugin is not active';
                    this.logResults(harc_obj, result, output, config_obj.getLink(true));
                }
                break;
            case 'com.glide.script.packages_call_removal':
                // 10.6 packages call removal tool
                var pcrt0 = new GlideRecord('sys_whitelist_package');
                pcrt0.query();
                if (!pcrt0.hasNext()) {
                    result = 'Pass';
                    output = 'Pre-conditions not met : Skipped Check';
                } else {
                    var pcrt1 = new GlideRecord('v_plugin');
                    pcrt1.addQuery('name', 'Packages Call Removal Tool');
                    pcrt1.addQuery('active', 'active');
                    pcrt1.query();
                    if (!pcrt1.hasNext()) {
                        result = 'Fail';
                        output = 'Plugin not active';
                    } else {
                        result = 'Pass';
                        output = 'Plugin is active';
                    }
                }
                this.logResults(harc_obj, result, output, config_obj.getLink(true));
                break;
            case 'com.glide.email_filter':
                //11.4 Email Spam Scoring and Filtering
                current = gs.getProperty('glide.email.read.active'); //incoming email must be active
                if (current != null && current.toLowerCase().toString() == 'true') {
                    output = gs.getProperty('glide.pop3.ignore_headers'); //get the value of the prerequisite property
                    if (!gs.nil(output)) { // if value is defined
                        this.checkPlugin(config_obj, harc_obj);
                        break;
                    } else {
                        result = 'Fail';
                        output = 'Prerequisite Property Not Defined';
                    }
                } else {
                    result = 'Pass';
                    output = 'Pre-conditons not met : Skipped check';
                }
                this.logResults(harc_obj, result, output, config_obj.getLink(true));
                break;
            default:
                // 3.1 Contextual Security
                // 3.4 Security Jump Start - ACL Rules
                // 3.11 SNC Access Control Plugin - Optional.
                // 8.1 High Security Plugin
                this.checkPlugin(config_obj, harc_obj);
                break;
        }
    },
    checkIPAccess: function(harc_obj) {
        //3.3 Restrict Access to Specific IP Ranges
        var ipRangeCheck = this.checkPluginDep('com.snc.ipauthenticator');
        var output = '';
        if (ipRangeCheck == 'Pass') {
            var ratsipr = new GlideRecordSecure('ip_access');
            ratsipr.addEncodedQuery('active=true');
            ratsipr.query();
            if (ratsipr.next()) {
                ratsipr.addEncodedQuery('type=allow^range_startISEMPTY^ORrange_startSTARTSWITH0.0.^ORrange_endISEMPTY^ORrange_endSTARTSWITH0.0.^ORrange_end=255.255.255.255');
                ratsipr.query();
                if (ratsipr.next()) {
                    result = 'Fail';
                    output = 'Not active';
                } else {
                    result = 'Pass';
                    output = 'active';
                }
            } else {
                result = 'Fail';
                output = 'No active controls';
            }
        } else {
            result = 'Fail';
            output = 'Dependent plugin is not active';
        }
        this.logResults(harc_obj, result, output, '/ip_access_list.do');
    },
    checkSysUser: function(harc_obj) {
        //5.1 Check for Default Credentials
        var a = new GlideRecordSecure('sys_user');
        a.addQuery('user_name', 'admin');
        a.addQuery('user_password', '0DPiKuNIrrVmD8IUCuw1hQxNqZc=');
        a.addQuery('active', 'true');
        a.query();
        var b = new GlideRecordSecure('sys_user');
        b.addQuery('user_name', 'itil');
        b.addQuery('user_password', 'q3zDxMCcVS+IN10lIqXqFbR7W7Q=');
        b.addQuery('active', 'true');
        b.query();
        var c = new GlideRecordSecure('sys_user');
        c.addQuery('user_name', 'employee');
        c.addQuery('user_password', 'yvMi8Lvtch6sSja/ev8RAwefryU=');
        c.addQuery('active', 'true');
        c.query();
        var output = '';
        if (!a.hasNext() && !b.hasNext() && !c.hasNext()) {
            result = 'Pass';
            output = 'No Default Credentials Found';
        } else {
            result = 'Fail';
            output = 'Found';
        }
        this.logResults(harc_obj, result, output, '/sys_user_list.do?sysparm_query=user_name%3Dadmin%5EORuser_name%3Ditil%5EORuser_name%3Demployee');
    },
    checkSysHome: function(harc_obj) {
        //5.2 Remove default credentials from the Welcome page
        a = new GlideRecordSecure('sys_home');
        a.addQuery('short_description', 'How To Login');
        a.addQuery('active', '1');
        a.addQuery('text', 'CONTAINS', 'The System Administrator');
        a.addQuery('text', 'CONTAINS', 'Password');
        a.query();
        var output = '';
        if (!a.hasNext()) {
            result = 'Pass';
            output = 'Not Found';
        } else {
            result = 'Fail';
            output = 'Found';
        }
        this.logResults(harc_obj, result, output, 'sys_home_list.do?sysparm_query=short_description%3DHow%20To%20Login%5EtextLIKEThe%20System%20Administrator%5EtextLIKEPassword');
    },
    checkSysInstallation: function(harc_obj) {
        //5.5 strong passwords
        var esp = new GlideRecordSecure('sys_properties');
        if (esp.get('name', 'glide.enable.password_policy')) {
            result = 'Pass';
            output = 'active';
        } else {
            result = 'Fail';
            output = 'Not active';
        }
        this.logResults(harc_obj, result, output, 'isc?id=security_top_recommendations');
    },
    checkWhitelistPackage: function(harc_obj) {
        // 10.7 system whitelist packages
        var d = new GlideRecordSecure('sys_whitelist_package');
        d.query();
        if (!d.hasNext()) {
            result = 'Pass';
            output = 'No Java Package Calls';
        } else {
            result = 'Fail';
            output = 'Existing Java Package Calls';
        }
        this.logResults(harc_obj, result, output, 'sys_whitelist_package_list');
    },
    checkWhitelistMember: function(harc_obj) {
        // 10.8 system whitelist member
        var cwmc1 = new GlideRecordSecure('sys_whitelist_member');
        cwmc1.query();
        if (!cwmc1.hasNext()) {
            result = 'Pass';
            output = 'No Java Member Calls';
        } else {
            result = 'Fail';
            output = 'Existing Java Member Calls';
        }
        this.logResults(harc_obj, result, output, 'sys_whitelist_member_list');
    },
    checkSysEventScriptAction: function(harc_obj) {
        //12.1 Managin Failed login Attempts
        var e = new GlideRecordSecure('sysevent_script_action');
        e.addQuery('sys_id', '5e5183350a0a0a0a00093b591ece409f');
        e.addQuery('active', '1');
        e.query();
        var f = new GlideRecordSecure('sysevent_script_action');
        f.addQuery('sys_id', '5e44f9bf0a0a0a0a019a6440b2137767');
        f.addQuery('active', '1');
        f.query();
        var g = new GlideRecordSecure('sysevent_script_action');
        g.addQuery('sys_id', 'd92636b2975301008e00958e3b297567');
        g.addQuery('active', '1');
        g.query();
        if ((e.hasNext() && f.hasNext()) || g.hasNext()) {
            result = 'Pass';
            output = 'active';
        } else {
            result = 'Fail';
            output = 'Not active';
        }
        this.logResults(harc_obj, result, output, '/sysevent_script_action_list.do?sysparm_query=GOTOnameLIKESNC%20User');
    },
    type: 'CalculateComplianceScore'
};
```