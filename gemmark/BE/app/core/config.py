from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "gemmark"
    APP_ENV: str = "development"

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
