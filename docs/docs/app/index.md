# App

The header and the dashboard of a web application, on core's shell and sidebar, and how to tell whether you need them.

An application is used every day by the same people to check a state and act on one thing. The layout it needs is already core's: the shell with its sidebar, the drawer on a phone, the sticky bar, the grid and the card. This package holds the two pieces that only an application has: the bar at the top of the main area, with the search and the account, and the dashboard, a grid of panels under the view's title.

- Every class starts with `.luz-app-`, uses semantic tokens only and sits in the cascade layer `luz.app`, after site's, landing's and cms's. Each pattern is a class on a native element, laid out in the markup by core's objects.
- It has no script. Load `app.css` after the CSS of tokens and core (and site's, if you use its search): [Install LUZ](https://nandovejer.github.io/luz/docs/get-started/#site-kinds) has the command and the CDN tags. The sidebar is core's, with its own optional script.
- It has a version of its own, 0.x while it grows, and needs version `^0.1.0` of tokens and core, declared as peer dependencies. Site is an optional peer: without it the bar has no search, and everything else renders the same.
- There is no sidebar of its own: [core's sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) opens as a drawer at 768 px and below, with no script. An icon rail and a collapsible sidebar are not in 0.1.
- The app page, an empty dashboard and an app with no sidebar need no CSS of their own: they are markup to copy on [App templates](https://nandovejer.github.io/luz/docs/app/templates/).

### Use app when

- You build a tool that people sign in to, with a sidebar of sections and a view for each.
- You want a quiet bar for the global tools, and a dashboard of panels for the view's state.

### Use another package when

- Your site is a landing page or a blog: [Landing](https://nandovejer.github.io/luz/docs/landing/) and [CMS](https://nandovejer.github.io/luz/docs/cms/) have their headers.
- You only need a sidebar and a content area: core's [layout](https://nandovejer.github.io/luz/docs/components/layout/) and [sidebar](https://nandovejer.github.io/luz/docs/components/sidebar/) are enough.
