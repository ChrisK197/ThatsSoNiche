import express from 'express';
const router = express.Router();
import axios from 'axios';
import { validString, validNumber } from '../helpers.js';
import dotenv from "dotenv";
import { getValidAccessToken, getSpotifyTokens, getSavedTracks, getArtistsFromTracks, getTrackPopularities, getArtistPopularities } from '../data/spotify.js';

dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

router.route('/').get((req, res) => {
    const notConnected = !req.session.spotify || !req.session.spotify.access_token;
    res.status(200).render('home', { notConnected });
});
router.route('/login').get((req, res) => {
    const scope = 'user-library-read';
    const query = new URLSearchParams({
        response_type: 'code',
        client_id: client_id,
        redirect_uri: redirect_uri,
        scope: scope,
    });
    res.redirect(`https://accounts.spotify.com/authorize?${query.toString()}`);
});
router.route('/callback').get(async (req, res) => {
    if (!req.query.code) {
        return res.status(400).render('error', { code: "400", error: "No code provided by Spotify." });
    }
    const code = validString(req.query.code);
    try {
        const tokens = await getSpotifyTokens(code);
        //console.log("Tokens:", tokens);
        req.session.spotify = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + tokens.expires_in * 1000,
        };
        const myProfile = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });
        //console.log(myProfile);
        req.session.userId = myProfile.data.id;
        res.redirect('/niche');
    } catch (error) {
        console.error('Error fetching access token:', error);
        res.status(500).render('error', { code: "500", error: "Spotify authentication failed" });
    }
});
router.route("/niche").get(async (req, res) => {
    const access_token = await getValidAccessToken(req);
    console.log("Access token:", access_token);
    const savedTracks = await getSavedTracks(access_token);
    console.log(`Retrieved ${savedTracks.length} saved tracks.`);
    const trackPopularities = getTrackPopularities(savedTracks);
    console.log(trackPopularities.slice(0, 10));
    const artistIds = getArtistsFromTracks(savedTracks);
    console.log(`Found ${artistIds.length} unique artists.`);
    const artistPopularities = await getArtistPopularities(access_token, artistIds);
    console.log(artistPopularities.slice(0, 10));

    res.render('niche', {
        playlist: result.playlist,
        allSongsLen: result.allSongsLen,
        addedSongsLen: result.numUploaded,
        pct: (result.numUploaded/result.allSongsLen * 100).toFixed(2)
    });
});
router.route('/logout', ).get((req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).render('error', { code: "500", error: "Could not log out" });
    }
    res.redirect('/');
  });
});
router.route('/clear').get((req, res) => {
    delete req.session.playlistResult;
    res.redirect('/');
});

export default router;