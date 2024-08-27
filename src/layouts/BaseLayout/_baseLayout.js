(function (d, s, id) {
  var js,
    fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s);
  js.id = id;
  js.src = "//connect.facebook.net/en_US/all.js#xfbml=1";
  fjs.parentNode.insertBefore(js, fjs);
})(document, "script", "facebook-jssdk");

!(function (d, s, id) {
  var js,
    fjs = d.getElementsByTagName(s)[0];
  if (!d.getElementById(id)) {
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);
  }
})(document, "script", "twitter-wjs");

(function (i, s, o, g, r, a, m) {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function () {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(window, document, "script", "//www.google-analytics.com/analytics.js", "ga");

ga("create", "UA-42649772-1", "mockuphone.com");
ga("send", "pageview");

var shotbotPopUpShow = function () {
  ga("send", "event", "shotbotPopUpShow", "popup");
};

var shotbotPopUpClick = function () {
  ga("send", "event", "shotbotPopUpClick", "click");
};

var shotbotPopUpHide = function () {
  ga("send", "event", "shotbotPopUpHide", "click");
};

var shotbot3TopBarShow = function () {
  ga("send", "event", "shotbot3-topbar-show", "show");
};

var shotbot3TopBarClick = function () {
  ga("send", "event", "shotbot3-topbar-click", "click");
};

var shotbot3TopBarLinkClick = function () {
  ga("send", "event", "shotbot3-topbar-link-click", "click");
};
