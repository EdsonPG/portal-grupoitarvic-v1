const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT y adjuntar los datos del usuario a req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.query?.token || req.query?.auth;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado: Token no proporcionado'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || '7e87715a68d0b18fd296808a354a372c3eb03378e63f9a0b82eab69f493b4f767a7e7a7338c3e0f4a180b2cf44fe78e211769d22f824cec2286a2278621f2316';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Token inválido o expirado'
    });
  }
};

/**
 * Middleware currificado para verificar si el usuario tiene uno de los roles permitidos.
 * @param {Array<string>} allowedRoles - Lista de roles permitidos (ej. ['admin'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado: Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tienes los privilegios necesarios para esta acción'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
