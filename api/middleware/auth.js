const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT y adjuntar los datos del usuario a req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado: Token no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
