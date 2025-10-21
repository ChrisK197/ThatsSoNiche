import spotifyRoutes from './spotify.js';

const constructorMethod = (app) => {
  app.use('/', spotifyRoutes);

  app.use(/(.*)/, (req, res) => {
    return res.status(404).render('error', {code: "404", error: 'Not found'});
  });
};

export default constructorMethod;