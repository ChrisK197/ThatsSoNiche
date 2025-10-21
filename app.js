import express from 'express';
const app = express();
import session from 'express-session';
import constructorMethod from './routes/index.js';

import exphbs from 'express-handlebars';

const handlebarsInstance = exphbs.create({
  defaultLayout: 'main',
  // Specify helpers which are only registered on this instance.
  helpers: {
    asJSON: (obj, spacing) => {
      if (typeof spacing === 'number')
        return new Handlebars.SafeString(JSON.stringify(obj, null, spacing));

      return new Handlebars.SafeString(JSON.stringify(obj));
    }
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');

app.use(session({
    secret: 'thatssoniche',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
}));

constructorMethod(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});