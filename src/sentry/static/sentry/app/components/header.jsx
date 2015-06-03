/*** @jsx React.DOM */

var React = require("react");

var AppState = require("../mixins/appState");
var Breadcrumbs = require("./breadcrumbs");
var ConfigStore = require("../stores/configStore");
var DropdownLink = require("./dropdownLink");
var Gravatar = require("./gravatar");
var MenuItem = require("./menuItem");
var OrganizationState = require("../mixins/organizationState");
var OrganizationStore = require("../stores/organizationStore");
var UserInfo = require("./userInfo");

var UserNav = React.createClass({
  shouldComponentUpdate(nextProps, nextState) {
    return false;
  },

  render() {
    var urlPrefix = ConfigStore.get('urlPrefix');
    var user = ConfigStore.get('user');

    if (!user) {
      // TODO
      return <div />;
    }

    var title = (
      <span>
        <Gravatar email={user.email} className="avatar" />
        <UserInfo user={user} className="user-name" />
      </span>
    );

    return (
      <DropdownLink
          topLevelClasses={this.props.className}
          menuClasses="dropdown-menu-right"
          title={title}>
        <MenuItem href={urlPrefix + '/account/settings/'}>Account</MenuItem>
        <MenuItem href={urlPrefix + '/auth/logout/'}>Sign out</MenuItem>
      </DropdownLink>
    );
  }
});

var OrganizationSelector = React.createClass({
  mixins: [
    AppState,
  ],

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.organization || {}).id !== (this.props.organization || {}).id;
  },

  render() {
    var singleOrganization = ConfigStore.get('singleOrganization');
    var activeOrg = this.props.organization;

    if (singleOrganization || !activeOrg) {
      return <div />;
    }

    var urlPrefix = ConfigStore.get('urlPrefix');
    var features = ConfigStore.get('features');

    return (
      <div className="org-selector">
        <DropdownLink
            title={activeOrg.name}>
          {OrganizationStore.getAll().map((org) => {
            return (
              <MenuItem key={org.slug} to="organizationDetails" params={{orgId: org.slug}}>
                {org.name}
              </MenuItem>
            );
          })}
          {features.has('organizations:create') &&
            <MenuItem divider={true} />
          }
          {features.has('organizations:create') &&
            <MenuItem href={urlPrefix + '/organizations/new/'}>New Organization</MenuItem>
          }
        </DropdownLink>
      </div>
    );
  }
});


var Header = React.createClass({
  mixins: [OrganizationState],

  render() {
    return (
      <header>
        <div className="container">
          <UserNav className="pull-right" />
          <a href="/" className="logo"><span className="icon-sentry-logo"></span></a>
          <OrganizationSelector organization={this.getOrganization()} />
        </div>
      </header>
    );
  }
});

module.exports = Header;
