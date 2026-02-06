const request = global.request;

describe('API Security Tests', () => {
  describe('GET /', () => {
    it('should return profile picker when no cookie is set', async () => {
      const response = await request
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/html/);
    });

    it('should set security headers', async () => {
      const response = await request.get('/');
      
      // Check for basic security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('POST /set-profile', () => {
    it('should reject empty username', async () => {
      const response = await request
        .post('/set-profile')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject XSS attempts', async () => {
      const xssPayload = {
        username: '<script>alert("xss")</script>'
      };

      const response = await request
        .post('/set-profile')
        .send(xssPayload)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should sanitize and accept valid username', async () => {
      const validUser = {
        username: 'testuser123'
      };

      const response = await request
        .post('/set-profile')
        .send(validUser)
        .expect(200);

      expect(response.body.username).toBe('testuser123');
    });
  });

  describe('API Endpoints Security', () => {
    it('should require authentication for /api/me', async () => {
      await request
        .get('/api/me')
        .expect(401);
    });

    it('should require authentication for /api/favorites', async () => {
      await request
        .get('/api/favorites')
        .expect(401);

      await request
        .post('/api/favorites')
        .send({})
        .expect(401);
    });

    it('should validate input for favorites', async () => {
      // First set a profile to get auth
      await request
        .post('/set-profile')
        .send({ username: 'testuser' });

      const invalidFavorite = {
        recipeText: '', // Empty recipe text
        title: 'Test Recipe'
      };

      const response = await request
        .post('/api/favorites')
        .send(invalidFavorite)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
