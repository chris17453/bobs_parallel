"""Domain errors. Routes let these bubble; a single handler renders the {error} contract."""


class DomainError(Exception):
    code = "error"
    status = 400

    def __init__(self, message=None):
        super().__init__(message or self.code)


class BadRequest(DomainError):
    code = "bad_request"
    status = 400


class Unauthorized(DomainError):
    code = "unauthenticated"
    status = 401


class Forbidden(DomainError):
    code = "forbidden"
    status = 403


class NotFound(DomainError):
    code = "not_found"
    status = 404


class Conflict(DomainError):
    code = "conflict"
    status = 409
