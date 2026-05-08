resource "aws_iam_role" "lambda_role" {
  name = "${var.application}-${var.component}-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"

        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-role-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "notifications" {
  function_name = "${var.application}-${var.component}-function-${var.environment}"
  role = aws_iam_role.lambda_role.arn
  runtime = "nodejs20.x"
  handler = "notifications-handler.handler"
  filename = "${path.root}/../../../build/notifications-handler.zip"
  source_code_hash = filebase64sha256("${path.root}/../../../build/notifications-handler.zip")

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-function-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_cloudwatch_event_rule" "notifications" {
  name = "${var.application}-${var.component}-rule-${var.environment}"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source = [
      "sebcel-chocoop"
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-rule-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule = aws_cloudwatch_event_rule.notifications.name
  event_bus_name = var.event_bus_name
  target_id = "notifications-lambda"
  arn = aws_lambda_function.notifications.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id = "AllowExecutionFromEventBridge"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifications.function_name
  principal = "events.amazonaws.com"
  source_arn = aws_cloudwatch_event_rule.notifications.arn
}