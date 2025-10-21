import axios from "axios";
import qs from 'qs';
import { validString, validNumber } from "../helpers.js";
import dotenv from "dotenv";
dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

/** AUTH **/

// Generate a token when logging in
export const getSpotifyTokens = async (code) => {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            qs.stringify({
                grant_type: 'authorization_code',
                redirect_uri: redirect_uri,
                code: validString(code),
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
                },
            }
        );
        return {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            expires_in: response.data.expires_in,
        };
  } catch (error) {
        console.error('Error fetching Spotify tokens:', error);
        throw error;
  }
};

// Refresh the token when it expires
export const refreshSpotifyToken = async (refresh_token) => {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: validString(refresh_token),
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
        },
      }
    );

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    throw error;
  }
};

// Get the access token, and refresh if needed
export const getValidAccessToken = async (req) => {
  const session = req.session.spotify;

  if (!session || !session.access_token || !session.refresh_token) {
    throw 'No Spotify session found';
  }

  const now = Date.now();
  if (now >= session.expires_at) {
    const refreshed = await refreshSpotifyToken(session.refresh_token);
    req.session.spotify.access_token = refreshed.access_token;
    req.session.spotify.expires_at = now + refreshed.expires_in * 1000;
  }

  return req.session.spotify.access_token;
};

/** DATA **/
export const getSavedTracks = async (access_token) => {
    try {
        access_token = validString(access_token);
        const response = await axios.get(
        `https://api.spotify.com/v1/me/tracks`,
        {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
            params: {
                limit: 50,
            },
        });
        if (!response.data.items || response.data.items.length === 0) {
            return null;
        }

        let tracks = {};
        for (let item of response.data.items) {
            let track = item.track;
            tracks[track.id] = track;
        }
        while (response.data.next) {
            const nextResponse = await axios.get(response.data.next, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                },
            });
            for (let item of nextResponse.data.items) {
                if (item.track && item.track.id) tracks[item.track.id] = item;
            }
            response.data.next = nextResponse.data.next;
        }
        return tracks;
    } catch (error) {
        console.error("Error fetching saved tracks: ", error);
        throw error;
    }
}

export const getArtistsFromTracks = (trackIds) => {
    try {
        let artistIdsSet = new Set();
        for (let trackId in trackIds) {
            let track = trackIds[trackId];
            if (track &&  track.artists) {
                for (let artist of track.artists) {
                    artistIdsSet.add(artist.id);
                }
            }
        }
        let artistIds = Array.from(artistIdsSet);
        return artistIds;
    } catch (error) {
        console.error("Error fetching artists from tracks: ", error);
        throw error;
    }
}

export const getTrackPopularities = (trackIds) => {
    try {
        let tracksArray = [];
        for (let trackKey in trackIds) {
            tracksArray.push(trackIds[trackKey]);
        }

        tracksArray.sort((a, b) => {
            if (a.popularity < b.popularity) return -1;
            if (a.popularity > b.popularity) return 1;
            return 0;
        });

        return tracksArray;
    } catch (error) {
        console.error("Error fetching track popularities: ", error);
        throw error;
    }
};

export const getArtistPopularities = async (access_token, artistIds) => {
    try {
        access_token = validString(access_token);
        let artists = [];
        for (let artistId of artistIds) {
            const response = await axios.get(
                `https://api.spotify.com/v1/artists/${artistId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                    },
                });
            if (!response.data || !response.data.popularity) {
                continue;
            }
            artists.push({id: artistId, popularity: response.data.popularity, name: response.data.name});
        }

        artists.sort((a, b) => {
            if (a.popularity < b.popularity) return -1;
            if (a.popularity > b.popularity) return 1;
            return 0;
        });

        return artists;
    } catch (error) {
        console.error("Error fetching artist popularities: ", error);
        throw error;
    }
};